import { Kline, IndicatorData } from '../types';

export const calculateEMA = (data: Kline[], period: number): number[] => {
  if (!data || data.length === 0) return [];
  
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  // Simple MA for the first value
  let sum = 0;
  let count = 0;
  for (let i = 0; i < Math.min(period, data.length); i++) {
    if (data[i] && !isNaN(data[i].close)) {
      sum += data[i].close;
      count++;
    }
  }
  
  if (count === 0) return Array(data.length).fill(NaN);

  let prevEma = sum / count;
  
  // Fill initial undefined spots
  for (let i = 0; i < period - 1; i++) {
    emaArray.push(NaN); 
  }
  emaArray.push(prevEma);

  for (let i = period; i < data.length; i++) {
    const currentPrice = data[i].close;
    if (isNaN(currentPrice)) {
      emaArray.push(prevEma); // Carry forward if data is bad
    } else {
      const currentEma = (currentPrice - prevEma) * k + prevEma;
      emaArray.push(currentEma);
      prevEma = currentEma;
    }
  }

  return emaArray;
};

export const calculateRSI = (data: Kline[], period: number = 14): number[] => {
  if (!data || data.length === 0) return [];

  const rsiArray: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  if (gains.length < period) return Array(data.length).fill(NaN);

  // First average gain/loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Fill initial spots
  for (let i = 0; i < period; i++) {
    rsiArray.push(NaN);
  }
  
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiArray.push(100 - (100 / (1 + rs)));

  // Smoothed averages
  for (let i = period + 1; i < data.length; i++) {
    const currentGain = gains[i - 1];
    const currentLoss = losses[i - 1];

    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

    if (avgLoss === 0) {
      rsiArray.push(100);
    } else {
      rs = avgGain / avgLoss;
      rsiArray.push(100 - (100 / (1 + rs)));
    }
  }

  return rsiArray;
};

export const processDataWithIndicators = (data: Kline[]): IndicatorData[] => {
  if (!data || data.length === 0) return [];

  // EMA 20 for trend direction
  const ema20 = calculateEMA(data, 20);
  // RSI 14 for momentum
  const rsi14 = calculateRSI(data, 14);

  return data.map((kline, index) => {
    const ema = ema20[index];
    const rsi = rsi14[index];
    
    let signal: 'BUY' | 'SELL' | null = null;
    
    // Signal Logic:
    // Buy: Price crosses above EMA20 AND RSI is healthy (not extremely overbought yet)
    // Sell: Price crosses below EMA20 AND RSI is dropping
    if (index > 0) {
      const prevKline = data[index-1];
      const prevEma = ema20[index-1];
      const prevRsi = rsi14[index-1];
      
      if (!isNaN(ema) && !isNaN(prevEma) && !isNaN(rsi)) {
        // Bullish Crossover
        if (prevKline.close <= prevEma && kline.close > ema) {
             // Filter: RSI must be rising and not overbought (>70)
             if (rsi > prevRsi && rsi < 70) {
                signal = 'BUY';
             }
        } 
        // Bearish Crossover
        else if (prevKline.close >= prevEma && kline.close < ema) {
             // Filter: RSI must be falling
             if (rsi < prevRsi && rsi > 30) {
                signal = 'SELL';
             }
        }
      }
    }

    return {
      ...kline,
      ema,
      rsi,
      signal
    };
  });
};