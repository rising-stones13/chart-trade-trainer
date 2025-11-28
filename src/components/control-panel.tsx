'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Download, Settings2, Loader2, Sigma, Palette } from 'lucide-react';
import { SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from './ui/sidebar';
import { cn } from '@/lib/utils';

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  colors: string[];
}

function ColorPalette({ selectedColor, onColorSelect, colors }: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(color => (
        <button
          key={color}
          type="button"
          className={cn(
            'w-6 h-6 rounded-full border-2',
            selectedColor.toLowerCase() === color.toLowerCase() ? 'border-ring' : 'border-transparent'
          )}
          style={{ backgroundColor: color }}
          onClick={() => onColorSelect(color)}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}


interface ControlPanelProps {
  fileLoaded: boolean;
  showWeeklyChart: boolean;
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onFetchData: () => void;
  isLoading: boolean;
  onWeeklyChartToggle: () => void;
  onMaSettingsToggle: () => void;
  upColor: string;
  downColor: string;
  onCandleColorChange: (target: 'upColor' | 'downColor', color: string) => void;
}

export function ControlPanel({
  fileLoaded,
  showWeeklyChart,
  ticker,
  onTickerChange,
  onFetchData,
  isLoading,
  onWeeklyChartToggle,
  onMaSettingsToggle,
  upColor,
  downColor,
  onCandleColorChange,
}: ControlPanelProps) {
    const upColors = ['#ef5350', '#26a69a', '#ffffff', '#ff9800', '#9c27b0', '#795548'];
    const downColors = ['#2196f3', '#ef5350', '#000000', '#607d8b', '#03a9f4', '#4caf50'];

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader>
        <h2 className="text-lg font-semibold sr-only">コントロールパネル</h2>
      </SidebarHeader>
      <div className="flex-grow overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>データ読み込み</SidebarGroupLabel>
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
          <SidebarGroupLabel>表示設定</SidebarGroupLabel>
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
                <Button variant="outline" size="icon" onClick={onMaSettingsToggle}>
                    <Sigma className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                チャート配色
              </Label>
              <div className="space-y-2">
                  <div>
                      <Label htmlFor="up-color-picker" className="text-sm mb-2 block">陽線</Label>
                      <ColorPalette 
                        colors={upColors} 
                        selectedColor={upColor} 
                        onColorSelect={(color) => onCandleColorChange('upColor', color)}
                      />
                  </div>
                  <div>
                      <Label htmlFor="down-color-picker" className="text-sm mb-2 block">陰線</Label>
                      <ColorPalette 
                        colors={downColors} 
                        selectedColor={downColor} 
                        onColorSelect={(color) => onCandleColorChange('downColor', color)}
                      />
                  </div>
              </div>
            </div>

          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </div>
  );
}
