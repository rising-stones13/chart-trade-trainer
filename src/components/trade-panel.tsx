'use client';

import type { Position } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

interface TradePanelProps {
  isReplay: boolean;
  positions: Position[];
  realizedPL: number;
  unrealizedPL: number;
  onTrade: (type: 'long' | 'short') => void;
  onClosePosition: (positionId: string) => void;
}

export function TradePanel({ isReplay, positions, realizedPL, unrealizedPL, onTrade, onClosePosition }: TradePanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };
  
  const totalPL = realizedPL + unrealizedPL;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">模擬トレード</CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={() => onTrade('long')} disabled={!isReplay} className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowUp className="mr-2 h-4 w-4" /> 買い
          </Button>
          <Button onClick={() => onTrade('short')} disabled={!isReplay} className="bg-red-600 hover:bg-red-700 text-white">
            <ArrowDown className="mr-2 h-4 w-4" /> 空売り
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2 rounded-md bg-muted">
                <div className="text-xs text-muted-foreground">評価損益</div>
                <div className={`text-lg font-bold ${unrealizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(unrealizedPL)}</div>
            </div>
            <div className="p-2 rounded-md bg-muted">
                <div className="text-xs text-muted-foreground">確定損益</div>
                <div className={`text-lg font-bold ${realizedPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(realizedPL)}</div>
            </div>
        </div>

        <div className="p-3 rounded-lg text-center bg-card-foreground text-background">
            <div className="text-sm">合計損益</div>
            <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatCurrency(totalPL)}</div>
        </div>

        <div className="flex-grow flex flex-col mt-2">
            <h3 className="text-md font-semibold mb-2">保有ポジション</h3>
            <ScrollArea className="flex-grow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>種別</TableHead>
                            <TableHead>単価</TableHead>
                            <TableHead>数量</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {positions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">ポジションがありません</TableCell>
                            </TableRow>
                        ) : (
                            positions.map(pos => (
                                <TableRow key={pos.id}>
                                    <TableCell className={pos.type === 'long' ? 'text-blue-400' : 'text-red-400'}>
                                        {pos.type === 'long' ? '買い' : '売り'}
                                    </TableCell>
                                    <TableCell>{formatCurrency(pos.entryPrice)}</TableCell>
                                    <TableCell>{pos.size}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onClosePosition(pos.id)} disabled={!isReplay}>
                                            <X className="h-4 w-4"/>
                                        </Button>
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
