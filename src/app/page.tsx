'use client';

import { useReducer } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import ChartTradeTrainer, { reducer, initialState } from '@/components/chart-trade-trainer';

export default function Home() {
  const { user, loading } = useAuth();
  // The state for the chart trainer is now managed here
  const [state, dispatch] = useReducer(reducer, initialState);

  // Props for the ControlPanel, to be passed to DashboardLayout
  const controlPanelProps = {
    fileLoaded: state.fileLoaded,
    upColor: state.upColor,
    downColor: state.downColor,
    onCandleColorChange: (target: 'upColor' | 'downColor', color: string) => {
      dispatch({ type: 'SET_CANDLE_COLOR', payload: { target, color } });
    },
    maConfigs: state.maConfigs,
    onMaToggle: (period: string) => dispatch({ type: 'TOGGLE_MA', payload: period }),
    rsiConfig: state.rsiConfig,
    onRsiToggle: () => dispatch({ type: 'TOGGLE_RSI' }),
    macdConfig: state.macdConfig,
    onMacdToggle: () => dispatch({ type: 'TOGGLE_MACD' }),
    volumeConfig: state.volumeConfig,
    onVolumeToggle: () => dispatch({ type: 'TOGGLE_VOLUME' }),
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p>読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {user ? (
        // Pass the props to DashboardLayout and the state/dispatch to the trainer
        <DashboardLayout controlPanelProps={controlPanelProps}>
          <ChartTradeTrainer state={state} dispatch={dispatch} />
        </DashboardLayout>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-4xl font-bold mb-4">ChartTrade Trainerへようこそ</h1>
          <p className="mb-8">ログインまたは新規登録して、トレーディングの練習を始めましょう。</p>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">新規登録</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
