'use client';

import React, { useEffect, useReducer, useMemo, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { generateWeeklyData, parseStockData, calculateRSI, calculateMACD } from '@/lib/data-helpers';
import type { AppState, CandleData, MAConfig, Position, PositionEntry, RSIConfig, MACDConfig, VolumeConfig, Trade } from '@/types';
import { StockChart } from './stock-chart';
import { TradePanel } from './trade-panel'; // Re-import TradePanel
import { LineChart, Loader2, FolderOpen, AreaChart } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

// Action and reducer logic remains unchanged.
// We are only changing the layout and component composition.
type Action =
  | { type: 'SET_CHART_DATA'; payload: { data: CandleData[]; title: string } }
  | { type: 'START_REPLAY'; payload: Date }
  | { type: 'NEXT_DAY' }
  | { type: 'TRADE'; payload: 'long' | 'short' }
  | { type: 'CLOSE_PARTIAL_POSITION'; payload: { type: 'long' | 'short', amount: number } }
  | { type: 'TOGGLE_MA'; payload: string }
  | { type: 'TOGGLE_RSI' }
  | { type: 'TOGGLE_MACD' }
  | { type: 'TOGGLE_VOLUME' }
  | { type: 'RESET_PREMIUM_FEATURES' }
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

const initialRsiConfig: RSIConfig = { visible: false, period: 14 };
const initialMacdConfig: MACDConfig = { visible: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
const initialVolumeConfig: VolumeConfig = { visible: true };

type AppStateWithLocal = AppState & {
  unrealizedPL: number,
  realizedPL: number,
};

export const initialState: AppStateWithLocal = {
  chartData: [],
  weeklyData: [],
  chartTitle: 'ChartTrade Trainer',
  fileLoaded: false,
  replayIndex: null,
  isReplay: false,
  positions: [],
  tradeHistory: [],
  realizedPL: 0,
  unrealizedPL: 0,
  maConfigs: initialMAConfigs,
  rsiConfig: initialRsiConfig,
  macdConfig: initialMacdConfig,
  volumeConfig: initialVolumeConfig,
  showWeeklyChart: false,
  upColor: '#ef5350',
  downColor: '#26a69a',
};

export function reducer(state: AppStateWithLocal, action: Action): AppStateWithLocal {
    // Reducer logic is correct and does not need changes
  switch (action.type) {
    case 'SET_CHART_DATA': {
      const { data, title } = action.payload;
      return {
        ...initialState, // Reset everything except UI settings
        maConfigs: state.maConfigs,
        rsiConfig: state.rsiConfig,
        macdConfig: state.macdConfig,
        volumeConfig: state.volumeConfig,
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
      const startIndex = state.chartData.findIndex(d => new Date((d.time as number) * 1000) >= date);
      if (startIndex === -1) return state; // Or show error
      return { ...state, replayIndex: startIndex, isReplay: true, positions: [], tradeHistory: [], realizedPL: 0, unrealizedPL: 0 };
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
      return { ...state, replayIndex: newIndex, unrealizedPL };
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
    case 'TOGGLE_MA': {
      const period = action.payload;
      return {
        ...state,
        maConfigs: {
          ...state.maConfigs,
          [period]: { ...state.maConfigs[period], visible: !state.maConfigs[period].visible },
        },
      };
    }
    case 'TOGGLE_RSI': {
      return {
        ...state,
        rsiConfig: { ...state.rsiConfig, visible: !state.rsiConfig.visible },
      };
    }
    case 'TOGGLE_MACD': {
        return {
          ...state,
          macdConfig: { ...state.macdConfig, visible: !state.macdConfig.visible },
        };
    }
    case 'TOGGLE_VOLUME': {
        return {
            ...state,
            volumeConfig: { ...state.volumeConfig, visible: !state.volumeConfig.visible },
        };
    }
    case 'RESET_PREMIUM_FEATURES': {
        const newMaConfigs = { ...state.maConfigs };
        for (const key in newMaConfigs) {
            newMaConfigs[key] = { ...newMaConfigs[key], visible: false };
        }
        return {
            ...state,
            maConfigs: newMaConfigs,
            rsiConfig: { ...state.rsiConfig, visible: false },
            macdConfig: { ...state.macdConfig, visible: false },
        };
    }
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

// We need to pass state and dispatch up to the parent (page.tsx) to provide them to DashboardLayout
interface ChartTradeTrainerProps {
  state: AppStateWithLocal;
  dispatch: React.Dispatch<Action>;
}

export default function ChartTradeTrainer({ state, dispatch }: ChartTradeTrainerProps) {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData && !userData.isPremium) {
      dispatch({ type: 'RESET_PREMIUM_FEATURES' });
    }
  }, [userData, dispatch]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fileContent = await file.text();
      const { data, meta } = parseStockData(fileContent);
      const title = meta.longName ? `${meta.longName} (${meta.symbol})` : file.name;
      dispatch({ type: 'SET_CHART_DATA', payload: { data, title } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイルの処理中にエラーが発生しました。';
      toast({ variant: 'destructive', title: 'エラー', description: errorMessage });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      dispatch({ type: 'START_REPLAY', payload: date });
    }
  };

  const handlePartialClose = (type: 'long' | 'short') => {
    dispatch({ type: 'CLOSE_PARTIAL_POSITION', payload: { type, amount: 100 } });
  };

  const displayedChartData = useMemo(() => {
      if (state.isReplay && state.replayIndex !== null) {
        return state.chartData.slice(0, state.replayIndex + 1);
      }
      return state.chartData;
  }, [state.isReplay, state.replayIndex, state.chartData]);
  
  const rsiData = useMemo(() => {
    if (!state.rsiConfig.visible) return [];
    return calculateRSI(state.chartData, state.rsiConfig.period);
  }, [state.chartData, state.rsiConfig.visible, state.rsiConfig.period]);

  const macdData = useMemo(() => {
    if (!state.macdConfig.visible) return [];
    return calculateMACD(state.chartData, state.macdConfig.fastPeriod, state.macdConfig.slowPeriod, state.macdConfig.signalPeriod);
  }, [state.chartData, state.macdConfig.visible, state.macdConfig.fastPeriod, state.macdConfig.slowPeriod, state.macdConfig.signalPeriod]);

  const allEntries = useMemo(() => state.positions.flatMap(p => 
      p.entries.map(e => ({
          ...e,
          type: p.type,
      }))
  ), [state.positions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] h-full overflow-hidden">
      {/* Main content area: Chart and its own simplified header */}
      <div className="flex flex-col h-full min-h-0 border-r">
        <header className="p-2 border-b flex items-center gap-2 flex-shrink-0">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                            disabled={!state.fileLoaded}
                        >
                            <AreaChart />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>週足</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <div className="border-l h-6 mx-2"></div>
            <h1 className="text-lg font-bold truncate">{state.chartTitle}</h1>
            <div className="flex items-center gap-2 ml-auto">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} disabled={isLoading} />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} size="sm">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                    {isLoading ? '読込中...' : 'ファイルを開く'}
                </Button>
            </div>
        </header>
        <main className="relative flex-1 min-w-0 min-h-0 bg-background">
            <div className="absolute inset-0">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Loader2 className="w-16 h-16 mb-4 animate-spin" /><p>データを読み込んでいます...</p></div>
                ) : state.fileLoaded ? (
                  <StockChart
                    key={`${state.chartTitle}-${state.upColor}-${state.downColor}`}
                    chartData={displayedChartData}
                    weeklyData={state.weeklyData}
                    positions={allEntries}
                    tradeHistory={state.tradeHistory}
                    maConfigs={state.maConfigs}
                    rsiData={rsiData}
                    macdData={macdData}
                    showWeeklyChart={state.showWeeklyChart}
                    onCloseWeeklyChart={() => dispatch({ type: 'TOGGLE_WEEKLY_CHART' })}
                    replayIndex={state.replayIndex}
                    upColor={state.upColor}
                    downColor={state.downColor}
                    volumeConfig={state.volumeConfig}
                    isPremium={!!userData?.isPremium}
                    chartTitle={state.chartTitle}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><LineChart className="w-24 h-24 mb-4" /><h2 className="text-2xl font-semibold">ChartTrade Trainer</h2><p>「ファイルを開く」から株価データ(JSON)を読み込みます。</p></div>
                )}
            </div>
        </main>
      </div>

      {/* Right side: Trade Panel */}
      <aside className="relative h-full overflow-y-auto">
         <div className="absolute inset-0">
            <TradePanel
              fileLoaded={state.fileLoaded}
              isReplay={state.isReplay}
              replayDate={state.isReplay && state.replayIndex !== null ? new Date((state.chartData[state.replayIndex].time as number) * 1000) : null}
              positions={state.positions}
              realizedPL={state.realizedPL}
              unrealizedPL={state.unrealizedPL}
              onTrade={(type) => dispatch({ type: 'TRADE', payload: type })}
              onClosePosition={handlePartialClose}
              onNextDay={() => dispatch({ type: 'NEXT_DAY' })}
              onDateChange={handleDateChange}
            />
        </div>
      </aside>
    </div>
  );
}
