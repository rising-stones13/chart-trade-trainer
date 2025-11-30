'use client';

import type { Position } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, CalendarIcon, Play } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Separator } from './ui/separator';
import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface TradePanelProps {
  fileLoaded: boolean;
  isReplay: boolean;
  replayDate: Date | null;
  positions: Position[];
  realizedPL: number;
  unrealizedPL: number;
  onTrade: (type: 'long' | 'short') => void;
  onClosePosition: (positionType: 'long' | 'short') => void;
  onNextDay: () => void;
  onDateChange: (date?: Date) => void;
}

export function TradePanel({ 
  fileLoaded,
  isReplay,
  replayDate,
  positions, 
  realizedPL, 
  unrealizedPL, 
  onTrade, 
  onClosePosition,
  onNextDay,
  onDateChange,
}: TradePanelProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const { userData } = useAuth();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
  };
  
  const totalPL = realizedPL + unrealizedPL;

  const handleDateSelect = (date?: Date) => {
    onDateChange(date);
    setIsCalendarOpen(false);
  };

  return (
    <Card className="h-full flex flex-col border-l">
      <CardHeader className="px-4 py-2">
        <CardTitle className="text-lg">デモトレード</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex flex-col flex-grow">
        <div className={`space-y-2 mb-2 ${!fileLoaded ? 'opacity-50 pointer-events-none' : ''}`}>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-9 px-3">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {replayDate ? format(replayDate, 'yyyy年M月d日', { locale: ja }) : <span>開始日を選択</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar 
                mode="single" 
                selected={replayDate || undefined} 
                onSelect={handleDateSelect} 
                initialFocus
                locale={ja}
              />
            </PopoverContent>
          </Popover>
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={onNextDay} disabled={!isReplay} size="sm">
              <Play className="mr-2 h-4 w-4" />
              翌日へ進む
            </Button>
          </div>
        </div>
        <Separator className="my-2"/>
        <div className="grid grid-cols-2 gap-2 mb-1">
          <Button onClick={() => onTrade('long')} disabled={!isReplay} className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-2">
            <ArrowUp className="mr-1 h-4 w-4" /> 買い
          </Button>
          <Button onClick={() => onTrade('short')} disabled={!isReplay || !userData?.isPremium} className="bg-red-600 hover:bg-red-700 text-white h-8 px-2">
            <ArrowDown className="mr-1 h-4 w-4" /> 空売り
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-1 mb-1">
            <div className="rounded-md bg-muted p-1">
                <div className="text-xs text-muted-foreground">評価損益</div>
                <div className={`font-bold ${unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(unrealizedPL)}</div>
            </div>
            <div className="rounded-md bg-muted p-1">
                <div className="text-xs text-muted-foreground">確定損益</div>
                <div className={`font-bold ${realizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(realizedPL)}</div>
            </div>
        </div>

        <div className="rounded-lg text-center bg-card-foreground text-background">
            <div className="text-xs">合計損益</div>
            <div className={`text-xl font-bold ${totalPL >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatCurrency(totalPL)}</div>
        </div>

        <div className="flex-grow flex flex-col min-h-0 mt-2">
            <h3 className="text-md font-semibold">保有ポジション</h3>
            <ScrollArea className="flex-grow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="h-8 px-2">種別</TableHead>
                            <TableHead className="h-8 px-2">平均単価</TableHead>
                            <TableHead className="h-8 px-2">数量</TableHead>
                            <TableHead className="h-8 px-2 text-right">決済</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-1">ポジションがありません</TableCell>
                            </TableRow>
                        ) : (
                            positions.map(pos => (
                                <TableRow key={pos.type}>
                                    <TableCell className={`p-2 font-bold ${pos.type === 'long' ? 'text-blue-400' : 'text-red-400'}`}>
                                        {pos.type === 'long' ? '買い' : '売り'}
                                    </TableCell>
                                    <TableCell className="p-2">{formatCurrency(pos.avgPrice)}</TableCell>
                                    <TableCell className="p-2">{pos.totalSize}</TableCell>
                                    <TableCell className="p-2 text-right">
                                        {pos.type === 'long' && (
                                            <Button variant="outline" size="sm" className="h-7 px-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => onClosePosition('long')} disabled={!isReplay}>
                                                売り決済
                                            </Button>
                                        )}
                                        {pos.type === 'short' && (
                                            <Button variant="outline" size="sm" className="h-7 px-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white" onClick={() => onClosePosition('short')} disabled={!isReplay}>
                                                買い決済
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
