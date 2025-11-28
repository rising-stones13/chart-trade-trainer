'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { MAConfig } from '@/types';
import { Separator } from "./ui/separator";

interface MaSettingsPanelProps {
  maConfigs: Record<string, MAConfig>;
  onMaToggle: (period: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaSettingsPanel({ maConfigs, onMaToggle, open, onOpenChange }: MaSettingsPanelProps) {

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
          <SheetHeader>
          <SheetTitle>移動平均線（MA）設定</SheetTitle>
          <SheetDescription>
              チャートに表示する移動平均線を選択します。
          </SheetDescription>
          </SheetHeader>
          <Separator className="my-4"/>
          <div className="space-y-4 py-4">
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
            </div>
      </SheetContent>
    </Sheet>
  );
}
