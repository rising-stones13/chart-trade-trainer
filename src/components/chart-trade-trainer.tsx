'use client';

import React, { useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import { getStockData } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { generateWeeklyData } from '@/lib/data-helpers';
import type { AppState, CandleData, MAConfig, Position, Trade, PositionEntry } from '@/types';
import { StockChart } from './stock-chart';
import { ControlPanel } from './control-panel';
import { TradePanel } from './trade-panel';
import { LineChart, Loader2, Menu, Download } from 'lucide-react';
import { MaSettingsPanel } from './ma-settings-panel';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';

type Action =
  | { type: 'SET_CHART_DATA'; payload: { data: CandleData[]; title: string } }
  | { type: 'START_REPLAY'; payload: Date }
  | { type: 'NEXT_DAY' }
  | { type: 'TRADE'; payload: 'long' | 'short' }
  | { type: 'CLOSE_PARTIAL_POSITION'; payload: { type: 'long' | 'short', amount: number } }
  | { type: 'TOGGLE_MA'; payload: string }
  | { type: 'TOGGLE_WEEKLY_CHART' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_CANDLE_COLOR'; payload: { target: 'upColor' | 'downColor'; color: string } };

const initialMAConfigs: Record<string, MAConfig> = {
  '5': { period: 5, color: '#FF5252', visible: true },
  '10': { period: 10, color: '#4CAF50', visible: true },
  '20': { period: 20, color: '#2196F3', visible: true },
  '50': { period: 50, color: '#9C27B0', visible: true },
  '100': { period: 100, color: '#FF9800', visible: true },
};

type AppStateWithLocal = AppState & {
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
  positions: [],
  tradeHistory: [],
  realizedPL: 0,
  unrealizedPL: 0,
  maConfigs: initialMAConfigs,
  showWeeklyChart: false,
  upColor: '#ef5350',
  downColor: '#26a69a',
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
      return { ...state, replayIndex: startIndex, isReplay: true, currentReplayDate, positions: [], tradeHistory: [], realizedPL: 0, unrealizedPL: 0 };
    }
    case 'NEXT_DAY': {
      if (state.replayIndex === null || state.replayIndex >= state.chartData.length - 1) {
        return { ...state, isReplay: false }; // End of data
      }
      const newIndex = state.replayIndex + 1;
      const currentPrice = state.chartData[newIndex].close;
      const unrealizedPL = state.positions.reduce((acc, pos) => {
        const pl = pos.type === 'long' ? (currentPrice - pos.avgPrice) * pos.totalSize : (pos.avgPrice - currentPrice) * pos.totalSize;
        return acc + pl;
      }, 0);
      const currentReplayDate = state.chartData[newIndex].time as string;
      return { ...state, replayIndex: newIndex, unrealizedPL, currentReplayDate };
    }
    case 'TRADE': {
        if (state.replayIndex === null) return state;
        const type = action.payload;
        const currentData = state.chartData[state.replayIndex];
        const newEntry: PositionEntry = {
            id: crypto.randomUUID(),
            price: currentData.close,
            size: 100, // Fixed size for now
            date: currentData.time,
        };

        const existingPosition = state.positions.find(p => p.type === type);
        let newPositions: Position[];

        if (existingPosition) {
            const updatedEntries = [...existingPosition.entries, newEntry];
            const totalSize = updatedEntries.reduce((sum, e) => sum + e.size, 0);
            const totalCost = updatedEntries.reduce((sum, e) => sum + e.price * e.size, 0);
            const avgPrice = totalCost / totalSize;
            
            const updatedPosition: Position = {
                ...existingPosition,
                entries: updatedEntries,
                totalSize,
                avgPrice,
            };

            newPositions = state.positions.map(p => p.type === type ? updatedPosition : p);
        } else {
            const newPosition: Position = {
                type: type,
                entries: [newEntry],
                totalSize: newEntry.size,
                avgPrice: newEntry.price,
            };
            newPositions = [...state.positions, newPosition];
        }
        
        return { ...state, positions: newPositions };
    }
    case 'CLOSE_PARTIAL_POSITION': {
        if (state.replayIndex === null) return state;
        const { type: positionType, amount } = action.payload;
        const positionToClose = state.positions.find(p => p.type === positionType);
        if (!positionToClose || positionToClose.totalSize < amount) return state;

        const currentPrice = state.chartData[state.replayIndex].close;
        const exitDate = state.chartData[state.replayIndex].time;

        let amountToClose = amount;
        const newTrades: Trade[] = [];
        const remainingEntries: PositionEntry[] = [];
        let realizedProfit = 0;

        // FIFO
        for (const entry of positionToClose.entries) {
            if (amountToClose <= 0) {
                remainingEntries.push(entry);
                continue;
            }

            const sizeToClose = Math.min(entry.size, amountToClose);
            const profit = positionType === 'long'
                ? (currentPrice - entry.price) * sizeToClose
                : (entry.price - currentPrice) * sizeToClose;
            
            realizedProfit += profit;

            newTrades.push({
                id: entry.id, // Or a new trade ID
                type: positionType,
                entryPrice: entry.price,
                size: sizeToClose,
                entryDate: entry.date,
                exitPrice: currentPrice,
                exitDate: exitDate,
                profit: profit,
            });

            if (entry.size > sizeToClose) {
                remainingEntries.push({ ...entry, size: entry.size - sizeToClose });
            }
            
            amountToClose -= sizeToClose;
        }

        let newPositions = [...state.positions];
        if (remainingEntries.length === 0) {
            // Position is fully closed
            newPositions = state.positions.filter(p => p.type !== positionType);
        } else {
            const newTotalSize = remainingEntries.reduce((sum, e) => sum + e.size, 0);
            const newTotalCost = remainingEntries.reduce((sum, e) => sum + e.price * e.size, 0);
            const newAvgPrice = newTotalCost / newTotalSize;
            const updatedPosition: Position = {
                ...positionToClose,
                entries: remainingEntries,
                totalSize: newTotalSize,
                avgPrice: newAvgPrice,
            };
            newPositions = state.positions.map(p => p.type === positionType ? updatedPosition : p);
        }
        
        const newRealizedPL = state.realizedPL + realizedProfit;
        
        const newUnrealizedPL = newPositions.reduce((acc, pos) => {
            const pl = pos.type === 'long' ? (currentPrice - pos.avgPrice) * pos.totalSize : (pos.avgPrice - currentPrice) * pos.totalSize;
            return acc + pl;
        }, 0);

        return {
            ...state,
            positions: newPositions,
            tradeHistory: [...state.tradeHistory, ...newTrades],
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

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      dispatch({ type: 'START_REPLAY', payload: date });
    }
  };

  const handleSetCandleColor = (target: 'upColor' | 'downColor', color: string) => {
    dispatch({ type: 'SET_CANDLE_COLOR', payload: { target, color } });
  };
  
  const handlePartialClose = (type: 'long' | 'short') => {
    dispatch({ type: 'CLOSE_PARTIAL_POSITION', payload: { type, amount: 100 } });
  };

  const displayedChartData = useMemo(() => {
      return state.isReplay && state.replayIndex !== null
        ? state.chartData.slice(0, state.replayIndex + 1)
        : state.chartData;
  }, [state.isReplay, state.replayIndex, state.chartData]);
  
  const allEntries = useMemo(() => state.positions.flatMap(p => 
      p.entries.map(e => ({
          id: e.id,
          type: p.type,
          entryPrice: e.price,
          size: e.size,
          entryDate: e.date,
      }))
  ), [state.positions]);

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
                    onWeeklyChartToggle={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                    onMaSettingsToggle={() => setIsMaSettingsOpen(true)}
                    upColor={state.upColor}
                    downColor={state.downColor}
                    onCandleColorChange={handleSetCandleColor}
                  />
                </div>
            </SheetContent>
          </Sheet>
          
          <div className="border-l border-border h-6 mx-2"></div>

          <h1 className="text-lg font-bold truncate">{state.chartTitle}</h1>
          
          <div className="flex items-center gap-2 ml-auto">
            <Input
              id="ticker-input"
              type="text"
              placeholder="例: 7203"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              disabled={isLoading}
              className="w-24"
            />
            <Button onClick={() => handleFetchData(ticker)} disabled={isLoading || !ticker} size="sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isLoading ? '' : '取得'}
            </Button>
          </div>
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
                positions={allEntries}
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
            replayDate={state.isReplay && state.replayIndex !== null ? new Date(state.chartData[state.replayIndex].time as string) : null}
            currentReplayDate={state.currentReplayDate}
            positions={state.positions}
            realizedPL={state.realizedPL}
            unrealizedPL={state.unrealizedPL}
            onTrade={(type) => dispatch({ type: 'TRADE', payload: type })}
            onClosePosition={handlePartialClose}
            onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
            onDateChange={handleDateChange}
          />
        </aside>
      </div>
    </div>
  );
}

    