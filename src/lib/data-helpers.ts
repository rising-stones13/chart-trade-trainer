import type { CandleData, LineData } from '@/types';

export function parseCSV(csvText: string): CandleData[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    throw new Error('CSVファイルにデータがありません。');
  }
  
  const headers = lines.shift()!.toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
  
  const dateIndex = headers.indexOf('date');
  const openIndex = headers.indexOf('open');
  const highIndex = headers.indexOf('high');
  const lowIndex = headers.indexOf('low');
  const closeIndex = headers.indexOf('close');
  const volumeIndex = headers.indexOf('volume');

  if ([dateIndex, openIndex, highIndex, lowIndex, closeIndex, volumeIndex].includes(-1)) {
    throw new Error('CSVヘッダーが無効です。Date, Open, High, Low, Close, Volume を含めてください。');
  }

  return lines.map(line => {
    const values = line.split(',');
    const dateStr = values[dateIndex]?.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return null;
    }
    return {
      time: dateStr,
      open: parseFloat(values[openIndex]),
      high: parseFloat(values[highIndex]),
      low: parseFloat(values[lowIndex]),
      close: parseFloat(values[closeIndex]),
      volume: parseInt(values[volumeIndex], 10),
    };
  }).filter((d): d is CandleData => d !== null && !isNaN(d.open) && d.time)
    .sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime());
}

export function generateWeeklyData(dailyData: CandleData[]): CandleData[] {
  if (dailyData.length === 0) return [];

  const weeklyDataMap = new Map<string, CandleData>();

  for (const day of dailyData) {
    const date = new Date(day.time as string);
    // Adjust for timezone offset to prevent day-of-week errors
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    const dayOfWeek = adjustedDate.getUTCDay();
    const weekStartDate = new Date(adjustedDate);
    weekStartDate.setUTCDate(adjustedDate.getUTCDate() - dayOfWeek);
    const weekStartString = weekStartDate.toISOString().split('T')[0];

    if (!weeklyDataMap.has(weekStartString)) {
      weeklyDataMap.set(weekStartString, {
        time: day.time,
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
      // Also update time to be the last day of the week so far
      week.time = day.time;
    }
  }

  return Array.from(weeklyDataMap.values()).sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime());
}

export function calculateMA(data: CandleData[], period: number): LineData[] {
  if (data.length < period) return [];
  const maData: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    maData.push({
      time: data[i].time, // Ensure the time is exactly the same as the candlestick data point
      value: parseFloat((sum / period).toFixed(2)),
    });
  }
  return maData;
}
