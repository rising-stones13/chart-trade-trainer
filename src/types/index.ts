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

export interface Position {
  id: string;
  type: 'long' | 'short';
  entryPrice: number;
  size: number;
  entryDate: Time;
  entryIndex: number;
}

export interface Trade extends Position {
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
