import { Kline, FearGreedData, Timeframe } from '../types';

// Using Binance public API as it is more CORS friendly for frontend demos than Kraken
const BASE_URL = 'https://api.binance.com/api/v3';

export const fetchKlines = async (symbol: string, interval: Timeframe, limit: number = 100): Promise<Kline[]> => {
  try {
    const response = await fetch(`${BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${interval} data`);
    }
    const data = await response.json();
    
    // Binance format: [openTime, open, high, low, close, volume, ...]
    return data.map((d: any) => ({
      time: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
      isGreen: parseFloat(d[4]) >= parseFloat(d[1])
    }));
  } catch (error) {
    console.error("Error fetching klines:", error);
    return [];
  }
};

export const fetchTickerPrice = async (symbol: string): Promise<number> => {
  try {
    const response = await fetch(`${BASE_URL}/ticker/price?symbol=${symbol}`);
    if (!response.ok) throw new Error("Failed to fetch ticker");
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return 0;
  }
};

export const fetchFearAndGreed = async (): Promise<FearGreedData | null> => {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return data.data[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching Fear & Greed:", error);
    return null;
  }
};