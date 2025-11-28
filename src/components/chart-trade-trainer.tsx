'use client';

import React, { useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import { getStockData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { generateWeeklyData } from '@/lib/data-helpers';
import type { AppState, CandleData, MAConfig, Position, Trade } from '@/types';
import { StockChart } from './stock-chart';
import { ControlPanel } from './control-panel';
import { TradePanel } from './trade-panel';
import { LineChart, Loader2, Menu } from 'lucide-react';
import { MaSettingsPanel } from './ma-settings-panel';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from './ui/button';

type Action =
  | { type: 'SET_CHART_DATA'; payload: { data: CandleData[]; title: string } }
  | { type: 'START_REPLAY'; payload: Date }
  | { type: 'NEXT_DAY' }
  | { type: 'TRADE'; payload: 'long' | 'short' }
  | { type: 'CLOSE_POSITION'; payload: string }
  | { type: 'TOGGLE_MA'; payload: string }
  | { type: 'TOGGLE_WEEKLY_CHART' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_REPLAY_DATE'; payload: Date | null }
  | { type: 'SET_CANDLE_COLOR'; payload: { target: 'upColor' | 'downColor'; color: string } };

const initialMAConfigs: Record<string, MAConfig> = {
  '5': { period: 5, color: '#FF5252', visible: true },
  '10': { period: 10, color: '#4CAF50', visible: true },
  '20': { period: 20, color: '#2196F3', visible: true },
  '50': { period: 50, color: '#9C27B0', visible: true },
  '100': { period: 100, color: '#FF9800', visible: true },
};

type AppStateWithLocal = AppState & {
  replayDate: Date | null,
  unrealizedPL: number,
  realizedPL: number,
};


const initialState: AppStateWithLocal = {
  chartData: [],
  weeklyData: [],
  chartTitle: 'ChartTrade Trainer',
  fileLoaded: false,
  replayIndex: null,
  isReplay: false,
  currentReplayDate: null,
  replayDate: null,
  positions: [],
  tradeHistory: [],
  realizedPL: 0,
  unrealizedPL: 0,
  maConfigs: initialMAConfigs,
  showWeeklyChart: false,
  upColor: '#26a69a',
  downColor: '#ef5350',
};

function reducer(state: AppStateWithLocal, action: Action): AppStateWithLocal {
  switch (action.type) {
    case 'SET_CHART_DATA': {
      const { data, title } = action.payload;
      return {
        ...initialState, // Reset everything except UI settings
        maConfigs: state.maConfigs,
        showWeeklyChart: state.showWeeklyChart,
        upColor: state.upColor,
        downColor: state.downColor,
        chartData: data,
        weeklyData: generateWeeklyData(data),
        chartTitle: title,
        fileLoaded: true,
      };
    }
    case 'START_REPLAY': {
      const date = action.payload as Date;
      const startIndex = state.chartData.findIndex(d => new Date(d.time as string) >= date);
      if (startIndex === -1) return state; // Or show error
      const currentReplayDate = state.chartData[startIndex].time as string;
      return { ...state, replayIndex: startIndex, isReplay: true, replayDate: date, currentReplayDate, positions: [], tradeHistory: [], realizedPL: 0, unrealizedPL: 0 };
    }
    case 'NEXT_DAY': {
      if (state.replayIndex === null || state.replayIndex >= state.chartData.length - 1) {
        return { ...state, isReplay: false }; // End of data
      }
      const newIndex = state.replayIndex + 1;
      const currentPrice = state.chartData[newIndex].close;
      const unrealizedPL = state.positions.reduce((acc, pos) => {
        const pl = pos.type === 'long' ? (currentPrice - pos.entryPrice) * pos.size : (pos.entryPrice - currentPrice) * pos.size;
        return acc + pl;
      }, 0);
      const currentReplayDate = state.chartData[newIndex].time as string;
      return { ...state, replayIndex: newIndex, unrealizedPL, currentReplayDate };
    }
    case 'TRADE': {
        if (state.replayIndex === null) return state;
        const type = action.payload;
        const currentData = state.chartData[state.replayIndex];

        const newPosition: Position = {
            id: crypto.randomUUID(),
            type,
            entryPrice: currentData.close,
            size: 100, // Fixed size for now
            entryDate: currentData.time,
            entryIndex: state.replayIndex,
        };
        return { ...state, positions: [...state.positions, newPosition] };
    }
    case 'CLOSE_POSITION': {
      if (state.replayIndex === null) return state;
      const positionId = action.payload;
      const positionToClose = state.positions.find(p => p.id === positionId);
      if (!positionToClose) return state;

      const currentPrice = state.chartData[state.replayIndex].close;
      const profit = positionToClose.type === 'long'
        ? (currentPrice - positionToClose.entryPrice) * positionToClose.size
        : (positionToClose.entryPrice - currentPrice) * positionToClose.size;

      const newTrade: Trade = {
        ...positionToClose,
        exitPrice: currentPrice,
        exitDate: state.chartData[state.replayIndex].time,
        profit,
      };

      const newRealizedPL = state.realizedPL + profit;
      const newPositions = state.positions.filter(p => p.id !== positionId);

      const newUnrealizedPL = newPositions.reduce((acc, pos) => {
        const pl = pos.type === 'long' ? (currentPrice - pos.entryPrice) * pos.size : (pos.entryPrice - currentPrice) * pos.size;
        return acc + pl;
      }, 0);

      return {
        ...state,
        positions: newPositions,
        tradeHistory: [...state.tradeHistory, newTrade],
        realizedPL: newRealizedPL,
        unrealizedPL: newUnrealizedPL,
      };
    }
    case 'TOGGLE_MA':
      const period = action.payload;
      return {
        ...state,
        maConfigs: {
          ...state.maConfigs,
          [period]: { ...state.maConfigs[period], visible: !state.maConfigs[period].visible },
        },
      };
    case 'TOGGLE_WEEKLY_CHART':
      return { ...state, showWeeklyChart: !state.showWeeklyChart };
    case 'SET_REPLAY_DATE':
      return {
        ...state,
        replayDate: action.payload,
        isReplay: false,
        replayIndex: null,
        positions: [],
        tradeHistory: [],
        realizedPL: 0,
        unrealizedPL: 0,
        currentReplayDate: null,
      };
    case 'SET_CANDLE_COLOR':
      return {
        ...state,
        [action.payload.target]: action.payload.color,
      };
    default:
      return state;
  }
}

export default function ChartTradeTrainer() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { toast } = useToast();
  const [ticker, setTicker] = useState('7203');
  const [isLoading, setIsLoading] = useState(false);
  const [isMaSettingsOpen, setIsMaSettingsOpen] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);


  const handleFetchData = useCallback(async (newTicker: string) => {
    if (!newTicker) {
      toast({ variant: 'destructive', title: 'エラー', description: '銘柄コードを入力してください。' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await getStockData(newTicker);
      if ('error' in result) {
        toast({ variant: 'destructive', title: 'エラー', description: result.error });
      } else {
        const { data, info } = result;
        const title = `${info.companyNameJapanese} (${newTicker})`;
        dispatch({ type: 'SET_CHART_DATA', payload: { data, title } });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'データの取得に失敗しました。';
      toast({ variant: 'destructive', title: 'エラー', description: errorMessage });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    handleFetchData('7203');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartReplay = () => {
    if(state.replayDate) {
        dispatch({ type: 'START_REPLAY', payload: state.replayDate });
    }
  }

  const handleSetCandleColor = (target: 'upColor' | 'downColor', color: string) => {
    dispatch({ type: 'SET_CANDLE_COLOR', payload: { target, color } });
  };

  const displayedChartData = useMemo(() => {
      return state.isReplay && state.replayIndex !== null
        ? state.chartData.slice(0, state.replayIndex + 1)
        : state.chartData;
  }, [state.isReplay, state.replayIndex, state.chartData]);

  return (
    <div className="flex flex-col h-screen font-body bg-background text-foreground">
      <header className="p-2 border-b border-border flex items-center gap-2 flex-shrink-0">
          <Sheet open={isControlPanelOpen} onOpenChange={setIsControlPanelOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[320px]">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>コントロールパネル</SheetTitle>
                </SheetHeader>
                <div className="p-4">
                  <MaSettingsPanel
                    maConfigs={state.maConfigs}
                    onMaToggle={(period) => dispatch({ type: 'TOGGLE_MA', payload: period })}
                    open={isMaSettingsOpen}
                    onOpenChange={setIsMaSettingsOpen}
                  />
                  <ControlPanel
                    fileLoaded={state.fileLoaded}
                    showWeeklyChart={state.showWeeklyChart}
                    ticker={ticker}
                    onTickerChange={setTicker}
                    onFetchData={() => handleFetchData(ticker)}
                    isLoading={isLoading}
                    onWeeklyChartToggle={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                    onMaSettingsToggle={() => setIsMaSettingsOpen(true)}
                    upColor={state.upColor}
                    downColor={state.downColor}
                    onCandleColorChange={handleSetCandleColor}
                  />
                </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold truncate">{state.chartTitle}</h1>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <main className="flex flex-col bg-background flex-1 min-h-0">
          <div className="flex-grow relative">
            {isLoading && !state.fileLoaded ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-16 h-16 mb-4 animate-spin" />
                <p>データを読み込んでいます...</p>
              </div>
            ) : state.fileLoaded ? (
              <StockChart
                key={`${state.chartTitle}-${state.upColor}-${state.downColor}`}
                chartData={displayedChartData}
                weeklyData={state.weeklyData}
                positions={state.positions}
                tradeHistory={state.tradeHistory}
                maConfigs={state.maConfigs}
                showWeeklyChart={state.showWeeklyChart}
                onCloseWeeklyChart={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                replayIndex={state.replayIndex}
                upColor={state.upColor}
                downColor={state.downColor}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <LineChart className="w-24 h-24 mb-4" />
                <h2 className="text-2xl font-semibold">ChartTrade Trainer</h2>
                <p>左のパネルから銘柄コードを入力してデータを取得します。</p>
              </div>
            )}
          </div>
        </main>

        <aside className="flex-none flex flex-col shrink-0 lg:w-[300px]">
          <TradePanel
            fileLoaded={state.fileLoaded}
            isReplay={state.isReplay}
            replayDate={state.replayDate}
            currentReplayDate={state.currentReplayDate}
            positions={state.positions}
            realizedPL={state.realizedPL}
            unrealizedPL={state.unrealizedPL}
            onTrade={(type) => dispatch({ type: 'TRADE', payload: type })}
            onClosePosition={(id) => dispatch({ type: 'CLOSE_POSITION', payload: id })}
            onStartReplay={handleStartReplay}
            onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
            onDateChange={(date) => dispatch({ type: 'SET_REPLAY_DATE', payload: date || null })}
          />
        </aside>
      </div>
    </div>
  );
}
