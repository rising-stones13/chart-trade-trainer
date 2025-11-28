import type { Time } from 'lightweight-charts';

export type CandleData = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type LineData = {
  time: Time;
  value: number | undefined | null | number;
};

// Represents a single entry within a consolidated position
export interface PositionEntry {
  id: string;
  price: number;
  size: number;
  date: Time;
}

// Represents a consolidated position (all longs or all shorts)
export interface Position {
  type: 'long' | 'short';
  entries: PositionEntry[];
  totalSize: number;
  avgPrice: number;
}

// Represents a closed trade from a single entry
export interface Trade {
  id: string;
  type: 'long' | 'short';
  entryPrice: number;
  size: number;
  entryDate: Time;
  exitPrice: number;
  exitDate: Time;
  profit: number;
}

export type MAConfig = {
  period: number;
  color: string;
  visible: boolean;
};

export type AppState = {
  chartData: CandleData[];
  weeklyData: CandleData[];
  chartTitle: string;
  fileLoaded: boolean;
  replayIndex: number | null;
  isReplay: boolean;
  currentReplayDate: string | null;
  positions: Position[];
  tradeHistory: Trade[];
  maConfigs: Record<string, MAConfig>;
  showWeeklyChart: boolean;
  upColor: string;
  downColor: string;
};

    