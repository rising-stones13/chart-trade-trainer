'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, LogicalRange } from 'lightweight-charts';
import { calculateMA } from '@/lib/data-helpers';
import type { CandleData, Position, Trade, MAConfig } from '@/types';
import { DraggableWindow } from './draggable-window';

interface StockChartProps {
  chartData: CandleData[];
  weeklyData: CandleData[];
  positions: Position[];
  tradeHistory: Trade[];
  replayIndex: number | null;
  maConfigs: Record<string, MAConfig>;
  showWeeklyChart: boolean;
  onCloseWeeklyChart: () => void;
}

const chartColors = {
  background: '#15191E',
  textColor: 'rgba(230, 230, 230, 0.9)',
  grid: '#2a2e39',
  border: '#3a3e4a',
  upColor: '#ef5350', // Red for up candles (Yosen)
  downColor: '#4FC3F7', // Cyan/Green for down candles (Insen)
};

const chartOptions = {
  layout: {
    background: { color: chartColors.background },
    textColor: chartColors.textColor,
  },
  grid: {
    vertLines: { color: chartColors.grid },
    horzLines: { color: chartColors.grid },
  },
  crosshair: { mode: CrosshairMode.Magnet },
  rightPriceScale: { borderColor: chartColors.border },
  timeScale: { borderColor: chartColors.border, timeVisible: true, secondsVisible: false },
};

const candleSeriesOptions = {
  upColor: chartColors.upColor,
  downColor: chartColors.downColor,
  borderDownColor: chartColors.downColor,
  borderUpColor: chartColors.upColor,
  wickDownColor: chartColors.downColor,
  wickUpColor: chartColors.upColor,
};

function WeeklyChart({ data }: { data: CandleData[] }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });
    
    const candleSeries = chart.addCandlestickSeries(candleSeriesOptions);
    candleSeries.setData(data);
    
    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current!.clientWidth, height: chartContainerRef.current!.clientHeight });
    window.addEventListener('resize', handleResize);

    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);
  
  return <div ref={chartContainerRef} className="w-full h-full" />;
}

export function StockChart({
  chartData,
  weeklyData,
  positions,
  tradeHistory,
  replayIndex,
  maConfigs,
  showWeeklyChart,
  onCloseWeeklyChart,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'>>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'>>(null);
  const maSeriesRefs = useRef<Record<string, ISeriesApi<'Line'>>>({});
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;
    
    const candleSeries = chart.addCandlestickSeries(candleSeriesOptions);
    candleSeriesRef.current = candleSeries;
    
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
      color: 'rgba(128, 128, 128, 0.5)',
    });
    chart.priceScale('volume_scale').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    // Create all MA series instances at initialization
    Object.values(maConfigs).forEach(config => {
        const period = config.period.toString();
        maSeriesRefs.current[period] = chart.addLineSeries({
            color: config.color,
            lineWidth: 3,
            lastValueVisible: false,
            priceLineVisible: false,
        });
    });

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current!.clientWidth, height: chartContainerRef.current!.clientHeight });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    candleSeriesRef.current.setData(chartData);
    const volumeData = chartData.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? chartColors.upColor : chartColors.downColor }));
    volumeSeriesRef.current.setData(volumeData);

    Object.values(maConfigs).forEach(config => {
        const period = config.period.toString();
        const series = maSeriesRefs.current[period];
        if (series) {
            const maData = calculateMA(chartData, config.period);
            series.setData(maData);
            series.applyOptions({ visible: config.visible });
        }
    });
    
    if (chartData.length > 1) {
      const dataLength = chartData.length;
      const from = Math.max(0, dataLength - 30);
      const to = dataLength - 1;
      
      chartRef.current.timeScale().setVisibleLogicalRange({ from, to } as LogicalRange);
    }
    
  }, [chartData, maConfigs]);
  
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    
    const allMarkers = [...positions, ...tradeHistory];
    const markers = allMarkers.map(p => {
        const isTrade = 'exitPrice' in p;

        if (isTrade) {
            const trade = p as Trade;
            return [
                { time: trade.entryDate, position: trade.type === 'long' ? 'belowBar' : 'aboveBar', color: chartColors.downColor, shape: 'arrowUp' as const, text: `E` },
                { time: trade.exitDate, position: trade.type === 'long' ? 'aboveBar' : 'belowBar', color: trade.profit > 0 ? chartColors.upColor : chartColors.downColor, shape: 'arrowDown' as const, text: `X` },
            ];
        }

        const position = p as Position;
        return { time: position.entryDate, position: position.type === 'long' ? 'belowBar' : 'aboveBar', color: position.type === 'long' ? chartColors.downColor : chartColors.upColor, shape: 'circle' as const, text: `${position.type.charAt(0).toUpperCase()}` };
    }).flat();

    const sortedMarkers = markers.sort((a, b) => {
        const timeA = new Date(a.time as string).getTime();
        const timeB = new Date(b.time as string).getTime();
        return timeA - timeB;
    });
    
    candleSeriesRef.current.setMarkers(sortedMarkers);
    
  }, [positions, tradeHistory]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />
      <DraggableWindow title="週足チャート" isOpen={showWeeklyChart} onClose={onCloseWeeklyChart}>
        <WeeklyChart data={weeklyData} />
      </DraggableWindow>
    </div>
  );
}
