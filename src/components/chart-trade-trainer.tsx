'use client';

import React, { useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import { getStockData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { generateWeeklyData } from '@/lib/data-helpers';
import type { AppState, CandleData, MAConfig, Position, Trade } from '@/types';
import { StockChart } from './stock-chart';
import { ControlPanel } from './control-panel';
import { TradePanel } from './trade-panel';
import { LineChart, Loader2 } from 'lucide-react';

type Action =
  | { type: 'SET_CHART_DATA'; payload: { data: CandleData[]; title: string } }
  | { type: 'START_REPLAY'; payload: Date }
  | { type: 'NEXT_DAY' }
  | { type: 'TRADE'; payload: 'long' | 'short' }
  | { type: 'CLOSE_POSITION'; payload: string }
  | { type: 'TOGGLE_MA'; payload: string }
  | { type: 'TOGGLE_WEEKLY_CHART' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TOGGLE_SCALE' }
  | { type: 'SET_REPLAY_DATE'; payload: Date | null };

const initialMAConfigs: Record<string, MAConfig> = {
  '5': { period: 5, color: 'red', visible: true },
  '10': { period: 10, color: 'green', visible: true },
  '20': { period: 20, color: 'blue', visible: true },
  '50': { period: 50, color: 'purple', visible: true },
  '100': { period: 100, color: 'orange', visible: true },
};

type AppStateWithLocal = AppState & {
  replayDate: Date | null,
  unrealizedPL: number,
  realizedPL: number,
  isLogScale: boolean,
};


const initialState: AppStateWithLocal = {
  chartData: [],
  weeklyData: [],
  chartTitle: 'ChartTrade Trainer',
  fileLoaded: false,
  replayIndex: null,
  isReplay: false,
  replayDate: null,
  positions: [],
  tradeHistory: [],
  realizedPL: 0,
  unrealizedPL: 0,
  maConfigs: initialMAConfigs,
  showWeeklyChart: false,
  isLogScale: false,
};

function reducer(state: AppStateWithLocal, action: Action): AppStateWithLocal {
  switch (action.type) {
    case 'SET_CHART_DATA': {
      const { data, title } = action.payload;
      return {
        ...initialState, // Reset everything except UI settings
        maConfigs: state.maConfigs,
        isLogScale: state.isLogScale,
        showWeeklyChart: state.showWeeklyChart,
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
      return { ...state, replayIndex: startIndex, isReplay: true, replayDate: date, positions: [], tradeHistory: [], realizedPL: 0, unrealizedPL: 0 };
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
      return { ...state, replayIndex: newIndex, unrealizedPL };
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
    case 'TOGGLE_SCALE':
      return { ...state, isLogScale: !state.isLogScale };
    case 'SET_REPLAY_DATE':
      return { ...state, replayDate: action.payload };
    default:
      return state;
  }
}

export default function ChartTradeTrainer() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { toast } = useToast();
  const [ticker, setTicker] = useState('7203');
  const [isLoading, setIsLoading] = useState(false);

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

  const displayedChartData = useMemo(() => {
      return state.isReplay && state.replayIndex !== null
        ? state.chartData.slice(0, state.replayIndex + 1)
        : state.chartData;
  }, [state.isReplay, state.replayIndex, state.chartData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[320px_1fr_300px] h-screen max-h-screen overflow-hidden font-body">
      <aside className="border-r border-border flex flex-col h-screen">
        <ControlPanel
          fileLoaded={state.fileLoaded}
          isReplay={state.isReplay}
          replayDate={state.replayDate}
          maConfigs={state.maConfigs}
          showWeeklyChart={state.showWeeklyChart}
          isLogScale={state.isLogScale}
          ticker={ticker}
          onTickerChange={setTicker}
          onFetchData={() => handleFetchData(ticker)}
          isLoading={isLoading}
          onStartReplay={handleStartReplay}
          onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
          onDateChange={(date) => dispatch({ type: 'SET_REPLAY_DATE', payload: date || null })}
          onMaToggle={(period) => dispatch({ type: 'TOGGLE_MA', payload: period })}
          onWeeklyChartToggle={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
          onScaleToggle={() => dispatch({ type: 'TOGGLE_SCALE' })}
        />
      </aside>

      <main className="flex flex-col h-screen bg-background">
        <header className="p-4 border-b border-border">
          <h1 className="text-xl font-bold truncate">{state.chartTitle}</h1>
        </header>
        <div className="flex-grow relative">
            {isLoading && !state.fileLoaded ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="w-16 h-16 mb-4 animate-spin" />
                    <p>データを読み込んでいます...</p>
                </div>
            ) : state.fileLoaded ? (
              <StockChart
                key={state.chartTitle} // Force re-mount when data changes completely
                chartData={displayedChartData}
                weeklyData={state.weeklyData}
                positions={state.positions}
                tradeHistory={state.tradeHistory}
                replayIndex={state.replayIndex}
                maConfigs={state.maConfigs}
                showWeeklyChart={state.showWeeklyChart}
                onCloseWeeklyChart={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                isLogScale={state.isLogScale}
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

      <aside className="border-l border-border flex-col h-screen hidden lg:flex">
         <TradePanel
            isReplay={state.isReplay}
            positions={state.positions}
            realizedPL={state.realizedPL}
            unrealizedPL={state.unrealizedPL}
            onTrade={(type) => dispatch({ type: 'TRADE', payload: type })}
            onClosePosition={(id) => dispatch({ type: 'CLOSE_POSITION', payload: id })}
        />
      </aside>
    </div>
  );
}
