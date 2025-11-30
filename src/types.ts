import { Time } from 'lightweight-charts';

export interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LineData {
  time: Time;
  value: number;
}

export interface MacdData {
  time: Time;
  macd?: number;
  signal?: number;
  histogram?: number;
}

export interface PositionEntry {
  id: string;
  price: number;
  size: number;
  date: Time;
}

export interface Position {
  type: 'long' | 'short';
  entries: PositionEntry[];
  totalSize: number;
  avgPrice: number;
}

export interface Trade {
  id: string;
  type: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  size: number;
  entryDate: Time;
  exitDate: Time;
  profit: number;
}

export interface MAConfig {
  period: number;
  color: string;
  visible: boolean;
}

export interface RSIConfig {
  visible: boolean;
  period: number;
}

export interface MACDConfig {
  visible: boolean;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export interface AppState {
  chartData: CandleData[];
  weeklyData: CandleData[];
  chartTitle: string;
  fileLoaded: boolean;
  replayIndex: number | null;
  isReplay: boolean;
  positions: Position[];
  tradeHistory: Trade[];
  maConfigs: Record<string, MAConfig>;
  rsiConfig: RSIConfig;
  macdConfig: MACDConfig;
  showWeeklyChart: boolean;
  upColor: string;
  downColor: string;
}

