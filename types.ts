export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isGreen: boolean;
}

export interface IndicatorData extends Kline {
  ema?: number;
  rsi?: number;
  signal?: 'BUY' | 'SELL' | null;
}

export enum Timeframe {
  H1 = '1h',
  H4 = '4h',
  D1 = '1d',
}

export interface ResonanceState {
  h1: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  h4: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  d1: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  isResonant: boolean;
  direction: 'LONG' | 'SHORT' | 'NONE';
}

export interface FearGreedData {
  value: string;
  value_classification: string; // e.g., "Extreme Fear"
  timestamp: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface RollingStep {
  step: number;
  startAmount: number; // Amount at start of step
  profit: number;      // Profit made in this step
  endAmount: number;   // Total after profit
  riskAmount: number;  // Amount risked
  entryPrice: number;  // Price to enter this step
  targetPrice: number; // Price target to hit profit
  stopLossPrice: number; // Specific price to stop loss
  isSafe: boolean;     // If stop loss is above break-even
}