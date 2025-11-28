'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Download, Play, Settings2, Loader2, Sigma } from 'lucide-react';
import { format } from 'date-fns';
import { SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from './ui/sidebar';

interface ControlPanelProps {
  fileLoaded: boolean;
  isReplay: boolean;
  replayDate: Date | null;
  showWeeklyChart: boolean;
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onFetchData: () => void;
  isLoading: boolean;
  onStartReplay: () => void;
  onNextDay: () => void;
  onDateChange: (date?: Date) => void;
  onWeeklyChartToggle: () => void;
  children: React.ReactNode;
}

export function ControlPanel({
  fileLoaded,
  isReplay,
  replayDate,
  showWeeklyChart,
  ticker,
  onTickerChange,
  onFetchData,
  isLoading,
  onStartReplay,
  onNextDay,
  onDateChange,
  onWeeklyChartToggle,
  children,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader>
        <h2 className="text-lg font-semibold">コントロールパネル</h2>
      </SidebarHeader>
      <div className="flex-grow overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>1. データ読み込み</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex w-full items-center space-x-2">
              <Input
                id="ticker-input"
                type="text"
                placeholder="例: 7203"
                value={ticker}
                onChange={(e) => onTickerChange(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={onFetchData} disabled={isLoading || !ticker} size="sm">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isLoading ? '' : '取得'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">東証の銘柄コードを入力してください。</p>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        <SidebarGroup className={!fileLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <SidebarGroupLabel>2. リプレイ機能</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3">
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
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        <SidebarGroup className={!fileLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <SidebarGroupLabel>3. 表示設定</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly-chart-toggle" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                週足チャート表示
              </Label>
              <Switch id="weekly-chart-toggle" checked={showWeeklyChart} onCheckedChange={onWeeklyChartToggle} />
            </div>

            <div className="flex items-center justify-between">
                <Label htmlFor="ma-settings-button" className="flex items-center gap-2">
                    <Sigma className="h-4 w-4" />
                    移動平均線 設定
                </Label>
                {children}
            </div>

          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </div>
  );
}
