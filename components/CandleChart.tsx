import React from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ReferenceDot,
} from 'recharts';
import { IndicatorData } from '../types';

interface CandleChartProps {
  data: IndicatorData[];
  height?: number;
}

// Custom shape for the Candlestick
const CustomCandle = (props: any) => {
  const { x, y, width, height, payload } = props;
  const isGreen = payload.isGreen;
  const color = isGreen ? '#0ecb81' : '#f6465d';

  return (
    <g>
      <rect x={x} y={y} width={width} height={height < 1 ? 1 : height} fill={color} />
    </g>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-binance-panel border border-gray-700 p-3 rounded shadow-lg text-xs z-50">
        <p className="text-gray-400 mb-1">{new Date(data.time).toLocaleString('zh-TW')}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-binance-muted">開:</span>
          <span className={data.isGreen ? 'text-binance-green' : 'text-binance-red'}>{data.open.toFixed(2)}</span>
          <span className="text-binance-muted">高:</span>
          <span className={data.isGreen ? 'text-binance-green' : 'text-binance-red'}>{data.high.toFixed(2)}</span>
          <span className="text-binance-muted">低:</span>
          <span className={data.isGreen ? 'text-binance-green' : 'text-binance-red'}>{data.low.toFixed(2)}</span>
          <span className="text-binance-muted">收:</span>
          <span className={data.isGreen ? 'text-binance-green' : 'text-binance-red'}>{data.close.toFixed(2)}</span>
          <span className="text-binance-primary">EMA(20):</span>
          <span>{data.ema ? data.ema.toFixed(2) : '-'}</span>
          <span className="text-purple-400">RSI(14):</span>
          <span>{data.rsi ? data.rsi.toFixed(2) : '-'}</span>
        </div>
      </div>
    );
  }
  return null;
};

const CandleChart: React.FC<CandleChartProps> = ({ data, height = 400 }) => {
  const processedData = data.map(d => ({
    ...d,
    bodyRange: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
  }));

  const minPrice = Math.min(...data.map(d => d.low));
  const maxPrice = Math.max(...data.map(d => d.high));
  const domain = [minPrice - (minPrice * 0.005), maxPrice + (maxPrice * 0.005)];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={processedData} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" vertical={false} />
        <XAxis 
          dataKey="time" 
          tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          stroke="#848e9c"
          tick={{ fontSize: 10 }}
          minTickGap={30}
        />
        <YAxis 
          domain={domain} 
          orientation="right" 
          stroke="#848e9c" 
          tick={{ fontSize: 10 }}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        
        {/* EMA Line */}
        <Line type="monotone" dataKey="ema" stroke="#fcd535" dot={false} strokeWidth={2} activeDot={false} />

        {/* Candlestick Body */}
        <Bar dataKey="bodyRange" shape={<CustomCandle />} />

        {/* Visual Signals (Dots) */}
        {processedData.map((entry, index) => {
          if (entry.signal === 'BUY') {
            return (
              <ReferenceDot 
                key={`buy-${index}`} 
                x={entry.time} 
                y={entry.low * 0.998} 
                r={5} 
                fill="#0ecb81" 
                stroke="#fff"
                strokeWidth={1}
                label={{ value: 'B', fill: 'white', fontSize: 8, position: 'center' }}
              />
            );
          }
          if (entry.signal === 'SELL') {
             return (
              <ReferenceDot 
                key={`sell-${index}`} 
                x={entry.time} 
                y={entry.high * 1.002} 
                r={5} 
                fill="#f6465d" 
                stroke="#fff"
                strokeWidth={1}
                label={{ value: 'S', fill: 'white', fontSize: 8, position: 'center' }}
              />
            );
          }
          return null;
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CandleChart;