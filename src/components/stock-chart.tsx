'use client';

import React, { useEffect, useRef } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CrosshairMode, 
  TimeChartOptions,
  LineData as LWCLineData, 
  HistogramData, 
  LineStyle, 
  ColorType,
  PriceScaleMode,
  UTCTimestamp,
  BusinessDay,
  SeriesMarker,
  SeriesMarkerPosition,
  Time
} from 'lightweight-charts';
import { calculateMA } from '@/lib/data-helpers';
import type { CandleData, Trade, MAConfig, MacdData, LineData, PositionEntry, VolumeConfig } from '@/types';
import { DraggableWindow } from './draggable-window';

interface StockChartProps {
  chartData: CandleData[];
  weeklyData: CandleData[];
  positions: (PositionEntry & { type: 'long' | 'short' })[];
  tradeHistory: Trade[];
  replayIndex: number | null;
  maConfigs: Record<string, MAConfig>;
  rsiData: LineData[];
  macdData: MacdData[];
  showWeeklyChart: boolean;
  onCloseWeeklyChart: () => void;
  upColor: string;
  downColor: string;
  volumeConfig: VolumeConfig;
}

const getChartOptions = (upColor: string, downColor:string) => ({
  layout: {
    background: { type: ColorType.Solid, color: '#15191E' },
    textColor: 'rgba(230, 230, 230, 0.9)',
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: '#2a2e39', style: LineStyle.Solid, visible: true },
    horzLines: { color: '#2a2e39', style: LineStyle.Solid, visible: true },
  },
  crosshair: { 
    mode: CrosshairMode.Magnet,
    vertLine: {
      width: 1,
      style: LineStyle.Dashed,
      visible: true,
      labelVisible: true,
      color: '#D1D4DC',
      labelBackgroundColor: '#4C525E'
    },
    horzLine: {
      width: 1,
      style: LineStyle.Dashed,
      visible: true,
      labelVisible: true,
      color: '#D1D4DC',
      labelBackgroundColor: '#4C525E'
    },
  },
  rightPriceScale: { 
    borderColor: '#3a3e4a',
    autoScale: true,
    scaleMargins: {
        top: 0.2,
        bottom: 0.2,
    },
    mode: PriceScaleMode.Normal,
    invertScale: false,
    alignLabels: true,
    borderVisible: true,
    visible: true,
    ticksVisible: true,
    entireTextOnly: false,
    minimumWidth: 0,
  },
  timeScale: { 
    borderColor: '#3a3e4a', 
    timeVisible: true, 
    secondsVisible: false,
    rightOffset: 12,
    barSpacing: 10,
    minBarSpacing: 5,
    fixLeftEdge: true,
    fixRightEdge: true,
    lockVisibleTimeRangeOnResize: false,
    rightBarStaysOnScroll: false,
    borderVisible: true,
    visible: true,
    ticksVisible: true,
    shiftVisibleRangeOnNewBar: true,
    allowShiftVisibleRangeOnWhitespaceReplacement: false,
    uniformDistribution: false,
    minimumHeight: 0,
    allowBoldLabels: false,

  },
  localization: {
    locale: 'en-US',
    dateFormat: 'yyyy-MM-dd',
  },
  handleScroll: true,
  handleScale: true,
  autoSize: false,
  watermark: {
      visible: false,
      text: '',
      fontSize: 48,
      fontFamily: 'Inter, sans-serif',
      fontStyle: '',
      color: 'rgba(0, 0, 0, 0)',
      horzAlign: 'center',
      vertAlign: 'center',
  },
  leftPriceScale: {
      visible: false,
      autoScale: false,
      mode: PriceScaleMode.Normal,
      invertScale: false,
      alignLabels: false,
      borderVisible: false,
      borderColor: '',
      scaleMargins: {
        top: 0,
        bottom: 0,
      },
      entireTextOnly: false,
      ticksVisible: false,
      minimumWidth: 0,
  },
  overlayPriceScales: {
    mode: PriceScaleMode.Normal,
    invertScale: false,
    alignLabels: false,
    scaleMargins: {
      top: 0,
      bottom: 0,
    },
    borderVisible: false,
    borderColor: '',
    entireTextOnly: false,
    ticksVisible: false,
    minimumWidth: 0,
  },
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

    const chartOptions = {
        ...getChartOptions(upColor, downColor),
    };
    const chart = createChart(chartContainerRef.current, chartOptions as TimeChartOptions);
    
    const candleSeries = chart.addCandlestickSeries(getCandleSeriesOptions(upColor, downColor));
    candleSeries.setData(data);
    
    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current!.clientWidth, height: chartContainerRef.current!.clientHeight });
    window.addEventListener('resize', handleResize);

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
  rsiData,
  macdData,
  showWeeklyChart,
  onCloseWeeklyChart,
  upColor,
  downColor,
  volumeConfig,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Record<string, ISeriesApi<any>>>({});
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      ...getChartOptions(upColor, downColor),
    } as TimeChartOptions);
    chartRef.current = chart;
    
    seriesRef.current.candle = chart.addCandlestickSeries(getCandleSeriesOptions(upColor, downColor));
    
    seriesRef.current.volume = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      priceLineVisible: false,
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    Object.values(maConfigs).forEach(config => {
        const period = config.period.toString();
        seriesRef.current[`ma${period}`] = chart.addLineSeries({
            color: config.color,
            lineWidth: 2,
            lastValueVisible: false,
            priceLineVisible: false,
        });
    });
    
    seriesRef.current.rsi = chart.addLineSeries({
        priceScaleId: 'rsi',
        color: '#FFC107',
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.9, bottom: 0 } });

    seriesRef.current.macdLine = chart.addLineSeries({ priceScaleId: 'macd', color: '#2196F3', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
    seriesRef.current.macdSignal = chart.addLineSeries({ priceScaleId: 'macd', color: '#FF5252', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
    seriesRef.current.macdHistogram = chart.addHistogramSeries({
        priceScaleId: 'macd',
        priceFormat: { type: 'volume' },
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chart.priceScale('macd').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });


    const handleResize = () => {
        chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Effect for updating data and dynamic options
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current.candle) return;
    
    seriesRef.current.candle.applyOptions(getCandleSeriesOptions(upColor, downColor));

    const currentData = replayIndex === null ? chartData : chartData.slice(0, replayIndex + 1);

    seriesRef.current.candle.setData(currentData);
    const volumeData = currentData.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(8, 153, 129, 0.5)' : 'rgba(239, 83, 80, 0.5)' }));
    seriesRef.current.volume.setData(volumeData as HistogramData[]);

    if (seriesRef.current.volume && chartRef.current) {
      seriesRef.current.volume.applyOptions({ visible: volumeConfig.visible });
      chartRef.current.priceScale('volume').applyOptions({ visible: volumeConfig.visible });
    }

    Object.values(maConfigs).forEach(config => {
        const period = config.period.toString();
        const series = seriesRef.current[`ma${period}`];
        if (series) {
            const maData = calculateMA(currentData, config.period);
            series.setData(maData);
            series.applyOptions({ visible: config.visible });
        }
    });

    if (seriesRef.current.rsi) {
        const rsiSlice = rsiData.slice(0, currentData.length);
        seriesRef.current.rsi.setData(rsiSlice);
        chartRef.current.priceScale('rsi').applyOptions({ visible: rsiData.length > 0 });
    }
    
    if (seriesRef.current.macdLine && seriesRef.current.macdSignal && seriesRef.current.macdHistogram) {
        const macdSlice = macdData.slice(0, currentData.length);
        const macdLine = macdSlice.map(d => ({ time: d.time, value: d.macd })).filter(d => d.value !== undefined);
        const signalLine = macdSlice.map(d => ({ time: d.time, value: d.signal })).filter(d => d.value !== undefined);
        const histogramData = macdSlice.map(d => ({ time: d.time, value: d.histogram, color: d.histogram && d.histogram > 0 ? upColor : downColor })).filter(d => d.value !== undefined);

        seriesRef.current.macdLine.setData(macdLine as LWCLineData[]);
        seriesRef.current.macdSignal.setData(signalLine as LWCLineData[]);
        seriesRef.current.macdHistogram.setData(histogramData as HistogramData[]);

        const isVisible = macdData.length > 0;
        chartRef.current.priceScale('macd').applyOptions({ visible: isVisible });
    }

  }, [chartData, replayIndex, maConfigs, rsiData, macdData, upColor, downColor, volumeConfig]);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Only scroll to the end when in replay mode
    if (replayIndex !== null) {
        const dataLength = chartData.length;
        const to = dataLength > 0 ? dataLength - 1 : 0;
        chartRef.current.timeScale().scrollToPosition(to, false);
    }
    // When not in replay mode (replayIndex is null), do nothing and let the chart use its default view.
  }, [replayIndex, chartData.length]);

  const timeToNumber = (time: Time): number => {
    if (typeof time === 'string') {
        return new Date(time).getTime() / 1000;
    }
    if (typeof time === 'object' && 'year' in time) { // BusinessDay
        return new Date(Date.UTC(time.year, time.month - 1, time.day)).getTime() / 1000;
    }
    return time as number; // UTCTimestamp
  };

  useEffect(() => {
    if (!seriesRef.current.candle) return;
    
    const tradeMarkers = tradeHistory.flatMap(trade => [
        { time: trade.entryDate, position: 'belowBar' as const, color: '#2196F3', shape: 'arrowUp' as const, text: `E` },
        { time: trade.exitDate, position: 'aboveBar' as const, color: trade.profit > 0 ? '#4CAF50' : '#F44336', shape: 'arrowDown' as const, text: `X` },
    ]);
    
    const positionMarkers = positions.map(p => ({ 
        time: p.date, 
        position: (p.type === 'long' ? 'belowBar' : 'aboveBar') as SeriesMarkerPosition, 
        color: p.type === 'long' ? '#2196F3' : '#F44336', 
        shape: 'circle' as const, 
        text: `${p.type.charAt(0).toUpperCase()}` 
    }));

    const allMarkers: SeriesMarker<Time>[] = [...tradeMarkers, ...positionMarkers];

    const sortedMarkers = allMarkers.sort((a, b) => timeToNumber(a.time) - timeToNumber(b.time));
    
    seriesRef.current.candle.setMarkers(sortedMarkers);
    
  }, [positions, tradeHistory, upColor, downColor]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />
      {showWeeklyChart && (
        <DraggableWindow title="週足チャート" isOpen={showWeeklyChart} onClose={onCloseWeeklyChart}>
          <WeeklyChart data={weeklyData} upColor={upColor} downColor={downColor} />
        </DraggableWindow>
      )}
    </div>
  );
}