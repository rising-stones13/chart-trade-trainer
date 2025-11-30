import type { CandleData, LineData, MacdData } from '@/types';
import { Time } from 'lightweight-charts';

// This is a simplified interface for what we expect from the Yahoo Finance v7 API response
interface YahooFinanceChartResult {
  chart: {
    result: {
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        instrumentType: string;
        firstTradeDate: number;
        regularMarketTime: number;
        gmtoffset: number;
        timezone: string;
        exchangeTimezoneName: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        previousClose: number;
        scale: number;
        priceHint: number;
        longName?: string;
        shortName?: string;
      };
      timestamp: number[];
      indicators: {
        quote: {
          high: (number | null)[];
          close: (number | null)[];
          low: (number | null)[];
          volume: (number | null)[];
          open: (number | null)[];
        }[];
      };
    }[];
    error: any;
  };
}


export function parseStockData(jsonText: string): { data: CandleData[], meta: YahooFinanceChartResult['chart']['result'][0]['meta'] } {
  const jsonData: YahooFinanceChartResult = JSON.parse(jsonText);
  
  if (jsonData.chart.error) {
    throw new Error(`Chart data error: ${jsonData.chart.error.description}`);
  }
  
  if (!jsonData.chart.result || jsonData.chart.result.length === 0) {
    throw new Error('No chart data found in the file.');
  }

  const result = jsonData.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  if (!timestamps || !quote) {
    throw new Error('Invalid data format: timestamps or quotes are missing.');
  }
  
  const candleData: CandleData[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    // Skip if any of the crucial values are null or missing
    if (
      timestamps[i] == null ||
      quote.open[i] == null ||
      quote.high[i] == null ||
      quote.low[i] == null ||
      quote.close[i] == null ||
      quote.volume[i] == null
    ) {
      continue;
    }
    
    candleData.push({
      time: timestamps[i] as Time,
      open: quote.open[i]!,
      high: quote.high[i]!,
      low: quote.low[i]!,
      close: quote.close[i]!,
      volume: quote.volume[i]!,
    });
  }

  // Sort just in case and remove duplicates
  const uniqueData = Array.from(new Map(candleData.map(item => [item.time, item])).values())
    .sort((a, b) => (a.time as number) - (b.time as number));

  return { data: uniqueData, meta: result.meta };
}


export function generateWeeklyData(dailyData: CandleData[]): CandleData[] {
    if (dailyData.length === 0) return [];

    const weeklyDataMap = new Map<string, CandleData>();

    for (const day of dailyData) {
        const date = new Date(typeof day.time === 'number' ? day.time * 1000 : day.time as string);
        const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        const dayOfWeek = adjustedDate.getUTCDay();
        const weekStartDate = new Date(adjustedDate);
        weekStartDate.setUTCDate(adjustedDate.getUTCDate() - dayOfWeek);
        const weekStartString = weekStartDate.toISOString().split('T')[0];

        if (!weeklyDataMap.has(weekStartString)) {
            weeklyDataMap.set(weekStartString, {
                time: weekStartString as Time, // Use week start date for weekly chart
                open: day.open,
                high: day.high,
                low: day.low,
                close: day.close,
                volume: day.volume || 0,
            });
        } else {
            const week = weeklyDataMap.get(weekStartString)!;
            week.high = Math.max(week.high, day.high);
            week.low = Math.min(week.low, day.low);
            week.close = day.close;
            week.volume = (week.volume || 0) + (day.volume || 0);
        }
    }

    return Array.from(weeklyDataMap.values()).sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime());
}

export function calculateMA(data: CandleData[], period: number): LineData[] {
  const result: LineData[] = [];
  if (!data || data.length < period) {
    return [];
  }
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: NaN });
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({
        time: data[i].time,
        value: parseFloat((sum / period).toFixed(2)),
      });
    }
  }
  return result;
}

export function calculateRSI(data: CandleData[], period: number = 14): LineData[] {
  const result: LineData[] = [];
  if (!data || data.length < period) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
    result.push({ time: data[i].time, value: NaN });
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  result[period-1] = { time: data[period-1].time, value: 100 - (100 / (1 + rs)) };

  for (let i = period; i < closePrices.length; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    let gain = 0;
    let loss = 0;
    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result[i] = { time: data[i].time, value: 100 - (100 / (1 + rs)) };
  }
  
  // To align with the candle data, we need to pad the beginning of the array with NaNs
  const rsiData = data.map((d, i) => {
    const rsiPoint = result.find(r => r.time === d.time);
    return {
      time: d.time,
      value: rsiPoint ? rsiPoint.value : NaN,
    };
  });

  return rsiData;
}

function calculateEMA(data: number[], period: number): (number | undefined)[] {
  const k = 2 / (period + 1);
  const emaArray: (number | undefined)[] = new Array(data.length);
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  emaArray[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    emaArray[i] = (data[i] * k) + (emaArray[i - 1]! * (1 - k));
  }
  return emaArray;
}

export function calculateMACD(data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdData[] {
  if (data.length < slowPeriod) {
    return [];
  }

  const closePrices = data.map(d => d.close);
  const fastEMAs = calculateEMA(closePrices, fastPeriod);
  const slowEMAs = calculateEMA(closePrices, slowPeriod);

  const macdLine: (number | undefined)[] = [];
  for (let i = 0; i < data.length; i++) {
    const fast = fastEMAs[i];
    const slow = slowEMAs[i];
    if (fast !== undefined && slow !== undefined) {
      macdLine.push(fast - slow);
    } else {
      macdLine.push(undefined);
    }
  }

  const signalLineInput = macdLine.filter((v): v is number => v !== undefined);
  const signalLine = calculateEMA(signalLineInput, signalPeriod);

  const macdResult: MacdData[] = [];
  let signalIndex = 0;
  for (let i = 0; i < data.length; i++) {
    const macdValue = macdLine[i];
    if (macdValue !== undefined && i >= slowPeriod -1) {
        // Find the corresponding signal value.
        // This is tricky because signalLine has fewer points.
        // This logic assumes we start pushing signal values after the first actual macd value.
        const signalValue = signalLine[signalIndex];
        const histogramValue = (signalValue !== undefined) ? macdValue - signalValue : undefined;
        
        macdResult.push({
            time: data[i].time,
            macd: macdValue,
            signal: signalValue,
            histogram: histogramValue,
        });

        signalIndex++;

    } else {
       macdResult.push({
        time: data[i].time,
        macd: undefined,
        signal: undefined,
        histogram: undefined,
      });
    }
  }

  // Pad the beginning of the signal line to align it with the MACD line
  const firstMacdIndex = macdResult.findIndex(d => d.macd !== undefined);
  if(firstMacdIndex !== -1) {
    const signalData = calculateEMA(macdResult.slice(firstMacdIndex).map(d => d.macd!), signalPeriod);
    let s_idx = 0;
    for(let i=firstMacdIndex; i<macdResult.length; i++) {
      const res = macdResult[i];
      if(res.macd !== undefined) {
        const signalValue = signalData[s_idx];
        res.signal = signalValue;
        if(signalValue !== undefined) {
            res.histogram = res.macd - signalValue;
        }
        s_idx++;
      }
    }
  }

  return macdResult;
}
