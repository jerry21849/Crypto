import React, { useState, useEffect, useCallback } from 'react';
import { Timeframe, ResonanceState, FearGreedData, IndicatorData, TelegramConfig } from './types';
import { fetchKlines, fetchFearAndGreed, fetchTickerPrice } from './services/cryptoService';
import { processDataWithIndicators } from './utils/indicators';
import CandleChart from './components/CandleChart';
import RollingCalculator from './components/RollingCalculator';
import TelegramSettings from './components/TelegramSettings';
import { sendTelegramMessage } from './services/telegramService';
import { Activity, Zap, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

const WATCHLIST = ['BTCUSDT', 'ETHUSDT'];

const App: React.FC = () => {
  const [activeSymbol, setActiveSymbol] = useState<string>('BTCUSDT');
  const [activeTab, setActiveTab] = useState<Timeframe>(Timeframe.H1);
  const [dataH1, setDataH1] = useState<IndicatorData[]>([]);
  const [dataH4, setDataH4] = useState<IndicatorData[]>([]);
  const [dataD1, setDataD1] = useState<IndicatorData[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [resonance, setResonance] = useState<ResonanceState>({
    h1: 'NEUTRAL', h4: 'NEUTRAL', d1: 'NEUTRAL', isResonant: false, direction: 'NONE'
  });
  
  // Store live prices for watchlist
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [showGreedAlert, setShowGreedAlert] = useState<boolean>(false);

  // Helper to determine trend based on Price vs EMA20
  const getTrend = (kline: IndicatorData): 'BULLISH' | 'BEARISH' | 'NEUTRAL' => {
    if (!kline.ema) return 'NEUTRAL';
    // Logic: Close > EMA = Bullish
    return kline.close > kline.ema ? 'BULLISH' : 'BEARISH';
  };

  // Fetch Tickers (Lighter weight, more frequent)
  const fetchPrices = useCallback(async () => {
    const newPrices: Record<string, number> = {};
    for (const sym of WATCHLIST) {
      const p = await fetchTickerPrice(sym);
      newPrices[sym] = p;
    }
    setPrices(prev => ({ ...prev, ...newPrices }));
  }, []);

  // Fetch Chart Data & Analysis (Heavier, less frequent)
  const fetchChartData = useCallback(async () => {
    setLoading(true);
    
    // Fetch all timeframes for resonance calculation
    const [h1, h4, d1, fg] = await Promise.all([
      fetchKlines(activeSymbol, Timeframe.H1),
      fetchKlines(activeSymbol, Timeframe.H4),
      fetchKlines(activeSymbol, Timeframe.D1),
      fetchFearAndGreed()
    ]);

    const pH1 = processDataWithIndicators(h1);
    const pH4 = processDataWithIndicators(h4);
    const pD1 = processDataWithIndicators(d1);

    setDataH1(pH1);
    setDataH4(pH4);
    setDataD1(pD1);
    setFearGreed(fg);

    // Extreme Greed Check (> 75 usually)
    if (fg && Number(fg.value) >= 75) {
      setShowGreedAlert(true);
    } else {
      setShowGreedAlert(false);
    }

    // Calculate Resonance
    if (pH1.length && pH4.length && pD1.length) {
      const lastH1 = pH1[pH1.length - 1];
      const lastH4 = pH4[pH4.length - 1];
      const lastD1 = pD1[pD1.length - 1];

      const tH1 = getTrend(lastH1);
      const tH4 = getTrend(lastH4);
      const tD1 = getTrend(lastD1);

      // Strict Resonance: All 3 match
      const isResonant = tH1 === tH4 && tH4 === tD1 && tH1 !== 'NEUTRAL';
      
      const newState: ResonanceState = {
        h1: tH1,
        h4: tH4,
        d1: tD1,
        isResonant,
        direction: isResonant ? (tH1 === 'BULLISH' ? 'LONG' : 'SHORT') : 'NONE'
      };

      setResonance(newState);
    }

    setLoading(false);
  }, [activeSymbol]);

  // Initial and Periodic Fetch for Prices
  useEffect(() => {
    fetchPrices();
    const priceInterval = setInterval(fetchPrices, 5000); // Every 5s
    return () => clearInterval(priceInterval);
  }, [fetchPrices]);

  // Initial and Periodic Fetch for Chart/Analysis
  useEffect(() => {
    fetchChartData();
    const chartInterval = setInterval(fetchChartData, 60000); // Every 1m
    return () => clearInterval(chartInterval);
  }, [fetchChartData]);

  const activeData = activeTab === Timeframe.H1 ? dataH1 : activeTab === Timeframe.H4 ? dataH4 : dataD1;
  const currentPrice = prices[activeSymbol] || 0;

  // Manual Trigger for TG from UI (Analysis Report)
  const sendAnalysisToTg = async () => {
    const configStr = localStorage.getItem('tg_config');
    if (!configStr) {
      alert("請先設定 Telegram 機器人資訊。");
      return;
    }
    const config = JSON.parse(configStr);
    const msg = `
📊 *${activeSymbol} 市場分析報告*
💰 當前價格: $${currentPrice.toFixed(2)}
😨 恐懼貪婪: ${fearGreed?.value} (${fearGreed?.value_classification})

*趨勢共振分析:*
1H (短線): ${resonance.h1 === 'BULLISH' ? '🟢 看漲' : '🔴 看跌'}
4H (波段): ${resonance.h4 === 'BULLISH' ? '🟢 看漲' : '🔴 看跌'}
1D (趨勢): ${resonance.d1 === 'BULLISH' ? '🟢 看漲' : '🔴 看跌'}

${resonance.isResonant 
  ? `🔥 *全維度共振訊號: ${resonance.direction === 'LONG' ? '做多 (LONG)' : '做空 (SHORT)'}* 🔥` 
  : '⚠️ 市場分歧，建議觀望'}
    `;
    const sent = await sendTelegramMessage(config, msg);
    if(sent) alert("分析報告已發送至 Telegram!");
    else alert("發送失敗，請檢查設定。");
  }

  return (
    <div className="min-h-screen bg-binance-bg text-binance-text flex flex-col md:flex-row font-sans">
      
      {/* Alert Banner for Extreme Greed */}
      {showGreedAlert && (
        <div className="fixed top-0 left-0 w-full bg-red-600/90 text-white text-center py-2 z-[9999] flex justify-center items-center gap-2 animate-bounce">
          <ShieldAlert size={20} />
          <span className="font-bold">警告：市場處於「極度貪婪」狀態 ({fearGreed?.value})！請謹慎加倉，隨時準備回調。</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-binance-panel border-r border-gray-800 flex flex-col shrink-0 relative z-20">
        <div className="p-4 border-b border-gray-800 pt-8 md:pt-4">
          <h1 className="text-xl font-bold text-binance-primary flex items-center gap-2">
            <Activity /> 滾倉神器 Pro
          </h1>
          <p className="text-xs text-binance-muted mt-1">全維度趨勢共振與複利系統</p>
        </div>

        <div className="p-4 space-y-5 flex-grow overflow-y-auto">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-binance-muted uppercase tracking-wider">合約監控 (點擊切換)</h3>
            
            {WATCHLIST.map(sym => (
               <div 
                 key={sym}
                 onClick={() => setActiveSymbol(sym)}
                 className={`p-3 rounded border flex justify-between items-center cursor-pointer transition-all ${
                    activeSymbol === sym 
                    ? 'bg-gray-800 border-binance-primary shadow-[inset_3px_0_0_0_#fcd535]' 
                    : 'bg-binance-bg border-gray-700 hover:border-gray-500'
                 }`}
               >
                <div className="flex items-center gap-2">
                  <img 
                    src={sym.includes('BTC') ? "https://cryptologos.cc/logos/bitcoin-btc-logo.png" : "https://cryptologos.cc/logos/ethereum-eth-logo.png"} 
                    alt={sym} 
                    className="w-6 h-6" 
                  />
                  <span className={`font-bold ${activeSymbol === sym ? 'text-white' : 'text-gray-400'}`}>
                    {sym.replace('USDT', '')}
                  </span>
                </div>
                <span className={`font-mono ${activeSymbol === sym ? 'text-binance-primary' : 'text-gray-300'}`}>
                  ${prices[sym] ? prices[sym].toFixed(2) : '---'}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-binance-muted uppercase tracking-wider">趨勢共振分析 ({activeSymbol.replace('USDT','')})</h3>
            <div className="space-y-2">
              <TrendIndicator label="1H 短線" trend={resonance.h1} />
              <TrendIndicator label="4H 波段" trend={resonance.h4} />
              <TrendIndicator label="1D 趨勢" trend={resonance.d1} />
            </div>
            
            {resonance.isResonant ? (
              <div className={`mt-3 p-4 rounded text-center font-bold text-black animate-pulse shadow-[0_0_15px_rgba(0,0,0,0.5)] ${resonance.direction === 'LONG' ? 'bg-binance-green shadow-green-500/20' : 'bg-binance-red shadow-red-500/20'}`}>
                🔥 強力共振: {resonance.direction === 'LONG' ? '做多' : '做空'}
                <div className="text-[10px] font-normal opacity-80 mt-1">勝率最高的時刻</div>
              </div>
            ) : (
              <div className="mt-3 p-3 rounded text-center bg-gray-700/50 text-gray-400 text-sm border border-gray-600 border-dashed">
                ⏳ 等待共振訊號...
              </div>
            )}
          </div>

          <button 
            onClick={sendAnalysisToTg}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3 rounded text-sm font-bold transition-all shadow-lg mt-4 flex items-center justify-center gap-2"
          >
            <Zap size={16} fill="white" />
            發送分析到 TG
          </button>
        </div>

        <TelegramSettings />
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-binance-bg shrink-0 pt-8 md:pt-0">
           <div className="flex items-center gap-6">
             <div className="hidden md:block">
                <span className="text-2xl font-bold text-white mr-2">{activeSymbol}</span>
                <span className="text-xs text-binance-primary border border-binance-primary rounded px-1">PERP</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded border border-gray-700">
                <AlertTriangle size={14} className={Number(fearGreed?.value) > 50 ? "text-binance-green" : "text-binance-red"} />
                <span className="text-xs text-gray-400">市場情緒:</span>
                <span className={`font-bold ${Number(fearGreed?.value) > 50 ? 'text-binance-green' : 'text-binance-red'}`}>
                  {fearGreed?.value || '--'} ({fearGreed?.value_classification || 'Loading'})
                </span>
             </div>
           </div>
           
           <button 
             onClick={fetchChartData} 
             className={`p-2 rounded hover:bg-gray-800 text-binance-primary transition-transform ${loading ? 'animate-spin' : ''}`}
             title="刷新數據"
           >
             <RefreshCw size={20} />
           </button>
        </header>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          {/* Chart Section */}
          <section className="flex-grow flex flex-col min-h-[50vh] border-r border-gray-800 relative">
            <div className="flex border-b border-gray-800 bg-binance-bg/50">
              {[Timeframe.H1, Timeframe.H4, Timeframe.D1].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTab(tf)}
                  className={`px-6 py-3 text-sm font-bold transition-colors relative ${
                    activeTab === tf ? 'text-binance-primary bg-gray-800' : 'text-binance-muted hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {tf.toUpperCase()}
                  {activeTab === tf && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-binance-primary"></div>}
                </button>
              ))}
            </div>
            
            <div className="flex-grow relative bg-binance-bg p-2">
              <CandleChart data={activeData} height={600} />
            </div>
          </section>

          {/* Strategy Section (Right Panel) */}
          <section className="w-full lg:w-[400px] bg-binance-bg p-4 overflow-y-auto border-l border-gray-800 shadow-xl z-10">
             <RollingCalculator currentPrice={currentPrice} symbol={activeSymbol} />
          </section>
        </div>
      </main>
    </div>
  );
};

const TrendIndicator: React.FC<{ label: string; trend: string }> = ({ label, trend }) => {
  let color = 'text-gray-500';
  let Icon = Activity;
  let text = '中性';
  
  if (trend === 'BULLISH') {
    color = 'text-binance-green';
    Icon = TrendingUp;
    text = '看漲';
  } else if (trend === 'BEARISH') {
    color = 'text-binance-red';
    Icon = TrendingDown;
    text = '看跌';
  }

  return (
    <div className="flex justify-between items-center bg-binance-bg p-3 rounded border border-gray-700 shadow-sm">
      <span className="text-xs font-medium text-binance-muted">{label}</span>
      <div className={`flex items-center gap-1 text-sm font-bold ${color}`}>
        <Icon size={14} />
        {text}
      </div>
    </div>
  );
};

export default App;