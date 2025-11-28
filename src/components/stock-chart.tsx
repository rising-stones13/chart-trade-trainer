'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, LogicalRange, ChartOptions } from 'lightweight-charts';
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
  upColor: string;
  downColor: string;
}

const getChartOptions = (upColor: string, downColor: string): Omit<ChartOptions, 'width' | 'height'> => ({
  layout: {
    background: { color: '#15191E' },
    textColor: 'rgba(230, 230, 230, 0.9)',
  },
  grid: {
    vertLines: { color: '#2a2e39' },
    horzLines: { color: '#2a2e39' },
  },
  crosshair: { mode: CrosshairMode.Magnet },
  rightPriceScale: { borderColor: '#3a3e4a' },
  timeScale: { borderColor: '#3a3e4a', timeVisible: true, secondsVisible: false },
});

const getCandleSeriesOptions = (upColor: string, downColor: string) => ({
  upColor: upColor,
  downColor: downColor,
  borderDownColor: downColor,
  borderUpColor: upColor,
  wickDownColor: downColor,
  wickUpColor: upColor,
});

function WeeklyChart({ data, upColor, downColor }: { data: CandleData[], upColor: string, downColor: string }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions = getChartOptions(upColor, downColor);
    const candleOptions = getCandleSeriesOptions(upColor, downColor);

    const chart = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });
    
    const candleSeries = chart.addCandlestickSeries(candleOptions);
    candleSeries.setData(data);
    
    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current!.clientWidth, height: chartContainerRef.current!.clientHeight });
    window.addEventListener('resize', handleResize);

    chart.timeScale().fitContent();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, upColor, downColor]);
  
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
  upColor,
  downColor,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'>>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'>>(null);
  const maSeriesRefs = useRef<Record<string, ISeriesApi<'Line'>>>({});
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chartOptions = getChartOptions(upColor, downColor);
    chartRef.current = createChart(chartContainerRef.current, chartOptions);
    const chart = chartRef.current;
    
    const candleSeriesOptions = getCandleSeriesOptions(upColor, downColor);
    candleSeriesRef.current = chart.addCandlestickSeries(candleSeriesOptions);
    
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
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
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Effect for updating data and dynamic options
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    
    // Update colors
    const candleOptions = getCandleSeriesOptions(upColor, downColor);
    candleSeriesRef.current.applyOptions(candleOptions);

    // Update data
    candleSeriesRef.current.setData(chartData);
    const volumeData = chartData.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? upColor : downColor }));
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
    
    const dataLength = chartData.length;
    if (dataLength > 1) {
      if (replayIndex === null) {
        const to = dataLength - 1;
        const from = Math.max(0, to - 40);
        chartRef.current.timeScale().setVisibleLogicalRange({ from, to } as LogicalRange);
      } else {
        const to = replayIndex;
        const from = Math.max(0, to - 100);
        chartRef.current.timeScale().setVisibleLogicalRange({ from, to } as LogicalRange);
      }
    }
    
  }, [chartData, maConfigs, upColor, downColor, replayIndex]);
  
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    
    const allMarkers = [...positions, ...tradeHistory];
    const markers = allMarkers.map(p => {
        const isTrade = 'exitPrice' in p;

        if (isTrade) {
            const trade = p as Trade;
            return [
                { time: trade.entryDate, position: trade.type === 'long' ? 'belowBar' : 'aboveBar', color: downColor, shape: 'arrowUp' as const, text: `E` },
                { time: trade.exitDate, position: trade.type === 'long' ? 'aboveBar' : 'belowBar', color: trade.profit > 0 ? upColor : downColor, shape: 'arrowDown' as const, text: `X` },
            ];
        }

        const position = p as Position;
        return { time: position.entryDate, position: position.type === 'long' ? 'belowBar' : 'aboveBar', color: position.type === 'long' ? downColor : upColor, shape: 'circle' as const, text: `${position.type.charAt(0).toUpperCase()}` };
    }).flat();

    const sortedMarkers = markers.sort((a, b) => {
        const timeA = new Date(a.time as string).getTime();
        const timeB = new Date(b.time as string).getTime();
        return timeA - timeB;
    });
    
    candleSeriesRef.current.setMarkers(sortedMarkers);
    
  }, [positions, tradeHistory, upColor, downColor]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />
      <DraggableWindow title="週足チャート" isOpen={showWeeklyChart} onClose={onCloseWeeklyChart}>
        <WeeklyChart data={weeklyData} upColor={upColor} downColor={downColor} />
      </DraggableWindow>
    </div>
  );
}
