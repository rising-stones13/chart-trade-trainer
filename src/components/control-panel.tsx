'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sigma, Palette, AreaChart, BarChart } from 'lucide-react';
import { SidebarGroup, SidebarGroupContent } from './ui/sidebar';
import type { MAConfig, RSIConfig, MACDConfig } from '@/types';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { useAuth } from '@/context/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ControlPanelProps {
  fileLoaded: boolean;
  upColor: string;
  downColor: string;
  onCandleColorChange: (target: 'upColor' | 'downColor', color: string) => void;
  maConfigs: Record<string, MAConfig>;
  onMaToggle: (period: string) => void;
  rsiConfig: RSIConfig;
  onRsiToggle: () => void;
  macdConfig: MACDConfig;
  onMacdToggle: () => void;
}

export function ControlPanel({
  fileLoaded,
  upColor,
  downColor,
  onCandleColorChange,
  maConfigs,
  onMaToggle,
  rsiConfig,
  onRsiToggle,
  macdConfig,
  onMacdToggle,
}: ControlPanelProps) {
  const { userData } = useAuth();
  const isPremium = userData?.isPremium;

  const PremiumFeature = ({ children, featureName }: { children: React.ReactNode, featureName: string }) => {
    if (isPremium) {
      return <>{children}</>;
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">{children}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{featureName}はプレミアム機能です。</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={`flex flex-col h-full ${!fileLoaded ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          チャート配色
        </Label>
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor="up-color-picker">陽線</Label>
                <Input 
                  id="up-color-picker"
                  type="color" 
                  value={upColor}
                  onChange={(e) => onCandleColorChange('upColor', e.target.value)}
                  className="w-16 h-8 p-1"
                />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="down-color-picker">陰線</Label>
                <Input
                  id="down-color-picker"
                  type="color"
                  value={downColor}
                  onChange={(e) => onCandleColorChange('downColor', e.target.value)}
                  className="w-16 h-8 p-1"
                />
            </div>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sigma className="h-4 w-4" />
          テクニカル指標
        </Label>
        <div className="space-y-4 pt-2">
          {Object.values(maConfigs).map(config => (
            <div key={config.period} className="flex items-center justify-between">
              <Label htmlFor={`ma-toggle-${config.period}`} className="text-base" style={{ color: config.color }}>
                {config.period}日 MA
              </Label>
              <Switch
                id={`ma-toggle-${config.period}`}
                checked={config.visible}
                onCheckedChange={() => onMaToggle(config.period.toString())}
              />
            </div>
          ))}
          <Separator />
          <PremiumFeature featureName="RSI">
            <div className="flex items-center justify-between">
              <Label htmlFor="rsi-toggle" className={`text-base ${!isPremium ? 'text-muted-foreground' : ''}`}>
                <AreaChart className="inline-block mr-2 h-4 w-4" />
                RSI
              </Label>
              <Switch
                id="rsi-toggle"
                checked={isPremium && rsiConfig.visible}
                onCheckedChange={onRsiToggle}
                disabled={!isPremium}
              />
            </div>
          </PremiumFeature>
          <PremiumFeature featureName="MACD">
            <div className="flex items-center justify-between">
              <Label htmlFor="macd-toggle" className={`text-base ${!isPremium ? 'text-muted-foreground' : ''}`}>
                <BarChart className="inline-block mr-2 h-4 w-4" />
                MACD
              </Label>
              <Switch
                id="macd-toggle"
                checked={isPremium && macdConfig.visible}
                onCheckedChange={onMacdToggle}
                disabled={!isPremium}
              />
            </div>
          </PremiumFeature>
        </div>
      </div>
    </div>
  );
}
