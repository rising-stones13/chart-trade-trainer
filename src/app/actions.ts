'use server';

import { identifyStockDetailsFromFilename } from '@/ai/flows/identify-stock-details-from-filename';
import type { CandleData } from '@/types';

export async function getStockInfoFromFilename(filename: string): Promise<{ tickerSymbol: string; companyNameJapanese: string } | { error: string }> {
  if (!filename) {
    return { error: 'ファイル名がありません。' };
  }

  try {
    const result = await identifyStockDetailsFromFilename({ filename });
    if (!result.tickerSymbol || !result.companyNameJapanese) {
      throw new Error("AI did not return expected fields.");
    }
    return result;
  } catch (error) {
    console.error('Error identifying stock details:', error);
    return { error: 'ファイル名から銘柄情報を特定できませんでした。' };
  }
}
