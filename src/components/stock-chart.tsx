'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp, Time, LineStyle, CrosshairMode, PriceScaleMode } from 'lightweight-charts';
import type { CandleData, LineData, Position, Trade, MAConfig } from '@/types';
import { DraggableWindow } from './draggable-window';

interface StockChartProps {
  dailyData: CandleData[];
  weeklyData: CandleData[];
  maData: { [key: string]: LineData[] };
  positions: Position[];
  tradeHistory: Trade[];
  replayIndex: number | null;
  maConfigs: Record<string, MAConfig>;
  showWeeklyChart: boolean;
  onCloseWeeklyChart: () => void;
  isLogScale: boolean;
}

const chartColors = {
  background: '#15191E',
  textColor: 'rgba(230, 230, 230, 0.9)',
  grid: '#2a2e39',
  border: '#3a3e4a',
  upColor: '#26a69a',
  downColor: '#ef5350',
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

function Chart({ data, title, isWeekly = false }: { data: CandleData[], title: string, isWeekly?: boolean }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      ...chartOptions,
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });
    chartApiRef.current = chart;

    const candleSeries = chart.addCandlestickSeries(candleSeriesOptions);
    candleSeriesRef.current = candleSeries;
    
    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current!.clientWidth, height: chartContainerRef.current!.clientHeight });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (chartApiRef.current && candleSeriesRef.current) {
        candleSeriesRef.current.setData(data);
        chartApiRef.current.timeScale().fitContent();
    }
  }, [data]);
  
  return <div ref={chartContainerRef} className="w-full h-full" />;
}

export function StockChart({
  dailyData,
  weeklyData,
  maData,
  positions,
  tradeHistory,
  replayIndex,
  maConfigs,
  showWeeklyChart,
  onCloseWeeklyChart,
  isLogScale,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maSeriesRefs = useRef<Record<string, ISeriesApi<'Line'>>>({});
  
  const chartData = useMemo(() => {
    return replayIndex !== null ? dailyData.slice(0, replayIndex + 1) : dailyData;
  }, [dailyData, replayIndex]);
  
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

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current!.clientWidth, height: chartContainerRef.current!.clientHeight });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);
  
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.priceScale().applyOptions({ mode: isLogScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal });
    }
  }, [isLogScale]);

  useEffect(() => {
    if (candleSeriesRef.current && volumeSeriesRef.current) {
      candleSeriesRef.current.setData(chartData);
      const volumeData = chartData.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)' }));
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [chartData]);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    Object.values(maConfigs).forEach(config => {
      const period = config.period.toString();
      let series = maSeriesRefs.current[period];
      if (!series) {
        series = chartRef.current!.addLineSeries({
          color: config.color,
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        maSeriesRefs.current[period] = series;
      }
      
      const dataForMa = replayIndex !== null ? maData[period]?.filter(d => (new Date(d.time as string) <= new Date(chartData[chartData.length - 1].time as string))) : maData[period];
      series.setData(dataForMa || []);
      series.applyOptions({ visible: config.visible });
    });
  }, [maData, maConfigs, chartData, replayIndex]);
  
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    
    const allMarkers = [...positions, ...tradeHistory];
    const markers = allMarkers.map(p => {
        const isEntry = 'entryPrice' in p && !('exitPrice' in p);
        const isTrade = 'exitPrice' in p;

        if (isTrade) {
            const trade = p as Trade;
            return [
                { time: trade.entryDate, position: trade.type === 'long' ? 'belowBar' : 'aboveBar', color: trade.type === 'long' ? chartColors.upColor : chartColors.downColor, shape: 'arrowUp' as const, text: `E` },
                { time: trade.exitDate, position: trade.type === 'long' ? 'aboveBar' : 'belowBar', color: trade.profit > 0 ? chartColors.upColor : chartColors.downColor, shape: 'arrowDown' as const, text: `X` },
            ];
        }

        const position = p as Position;
        return { time: position.entryDate, position: position.type === 'long' ? 'belowBar' : 'aboveBar', color: position.type === 'long' ? chartColors.upColor : chartColors.downColor, shape: 'circle' as const, text: `${position.type.charAt(0).toUpperCase()}` };
    }).flat();
    
    candleSeriesRef.current.setMarkers(markers);
    
  }, [positions, tradeHistory]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />
      <DraggableWindow title="週足チャート" isOpen={showWeeklyChart} onClose={onCloseWeeklyChart}>
        <Chart data={weeklyData} title="Weekly" isWeekly={true} />
      </DraggableWindow>
    </div>
  );
}
