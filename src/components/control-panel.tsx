'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Download, Play, Settings2, Sigma, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { MAConfig } from '@/types';

interface ControlPanelProps {
  fileLoaded: boolean;
  isReplay: boolean;
  replayDate: Date | null;
  maConfigs: Record<string, MAConfig>;
  showWeeklyChart: boolean;
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onFetchData: () => void;
  isLoading: boolean;
  onStartReplay: () => void;
  onNextDay: () => void;
  onDateChange: (date?: Date) => void;
  onMaToggle: (period: string) => void;
  onWeeklyChartToggle: () => void;
}

export function ControlPanel({
  fileLoaded,
  isReplay,
  replayDate,
  maConfigs,
  showWeeklyChart,
  ticker,
  onTickerChange,
  onFetchData,
  isLoading,
  onStartReplay,
  onNextDay,
  onDateChange,
  onMaToggle,
  onWeeklyChartToggle,
}: ControlPanelProps) {

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">コントロールパネル</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col gap-6 overflow-y-auto">
        
        <div>
          <Label htmlFor="ticker-input" className="text-base font-semibold">1. データ読み込み</Label>
          <div className="flex w-full items-center space-x-2 mt-2">
            <Input 
              id="ticker-input" 
              type="text" 
              placeholder="例: 7203" 
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value)}
              disabled={isLoading}
            />
            <Button onClick={onFetchData} disabled={isLoading || !ticker}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isLoading ? '' : '取得'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">東証の銘柄コードを入力してください。</p>
        </div>
        
        <Separator />

        <div className={!fileLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <Label className="text-base font-semibold">2. リプレイ機能</Label>
          <div className="mt-2 space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {replayDate ? format(replayDate, 'PPP') : <span>開始日を選択</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={replayDate || undefined} onSelect={onDateChange} initialFocus />
              </PopoverContent>
            </Popover>
            <Button onClick={onStartReplay} disabled={!replayDate || isReplay} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              リプレイ開始
            </Button>
            <Button onClick={onNextDay} disabled={!isReplay} className="w-full">
              翌日へ進む
            </Button>
          </div>
        </div>

        <Separator />
        
        <div className={!fileLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <Label className="text-base font-semibold">3. 表示設定</Label>
          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-chart-toggle" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                週足チャート表示
              </Label>
              <Switch id="weekly-chart-toggle" checked={showWeeklyChart} onCheckedChange={onWeeklyChartToggle} />
            </div>
            
            <div>
              <Label className="font-medium">移動平均線 (MA)</Label>
              <div className="space-y-3 mt-2">
                {Object.values(maConfigs).map(config => (
                  <div key={config.period} className="flex items-center justify-between">
                    <Label htmlFor={`ma-toggle-${config.period}`} style={{ color: config.color }}>
                      {config.period}日 MA
                    </Label>
                    <Switch id={`ma-toggle-${config.period}`} checked={config.visible} onCheckedChange={() => onMaToggle(config.period.toString())} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
