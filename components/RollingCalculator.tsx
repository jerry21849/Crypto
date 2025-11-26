import React, { useState, useEffect } from 'react';
import { RollingStep } from '../types';
import { sendTelegramMessage } from '../services/telegramService';
import { Calculator, ShieldCheck, ShieldAlert, ArrowDown, ArrowUp, Send, Link, Unlock, Lock } from 'lucide-react';

interface Props {
  currentPrice: number;
  symbol: string;
}

const RollingCalculator: React.FC<Props> = ({ currentPrice, symbol }) => {
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [profitTarget, setProfitTarget] = useState<number>(30); // 30% ROI per step
  const [leverage, setLeverage] = useState<number>(10); // 10x default
  const [steps, setSteps] = useState<number>(5);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [syncPrice, setSyncPrice] = useState<boolean>(true); // New: Auto-sync price
  
  const [calculatedSteps, setCalculatedSteps] = useState<RollingStep[]>([]);

  // Update entry price when prop changes if sync is enabled
  useEffect(() => {
    if (syncPrice && currentPrice > 0) {
      setEntryPrice(currentPrice);
    }
  }, [currentPrice, syncPrice]);

  useEffect(() => {
    calculateStrategy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCapital, profitTarget, steps, entryPrice, direction, leverage]);

  const calculateStrategy = () => {
    let currentCapital = initialCapital;
    let currentEntryPrice = entryPrice > 0 ? entryPrice : currentPrice; // Fallback
    const results: RollingStep[] = [];

    // Avoid division by zero
    const effLeverage = leverage > 0 ? leverage : 1;
    const effPrice = currentEntryPrice > 0 ? currentEntryPrice : 1;

    for (let i = 1; i <= steps; i++) {
      // Logic:
      // Profit Target is ROI % on MARGIN.
      // E.g. 30% Profit Target with 10x Leverage means Price must move 3%.
      const targetRoi = profitTarget / 100; // 0.3
      const priceMovePercent = targetRoi / effLeverage; // 0.03 (3%)

      const stepTargetPrice = direction === 'LONG'
        ? currentEntryPrice * (1 + priceMovePercent)
        : currentEntryPrice * (1 - priceMovePercent);

      const profit = currentCapital * targetRoi;
      const endAmount = currentCapital + profit;
      
      // Stop Loss Logic (Risk Management):
      // Step 1: Risk 5% of principal.
      // Step 2+: Risk ONLY the profit from previous steps (Protect Principal).
      
      let riskAmount = 0;
      let isSafe = false;

      if (i === 1) {
        riskAmount = currentCapital * 0.05; // Fixed 5% risk
        isSafe = false;
      } else {
        const buffer = currentCapital - initialCapital;
        if (buffer > 0) {
            riskAmount = buffer; // Risk all profit (Aggressive Rolling)
            isSafe = true;
        } else {
            riskAmount = currentCapital * 0.05;
            isSafe = false;
        }
      }

      // Calculate SL Price based on Risk Amount
      // Risk Amount / Current Capital = Loss % on Equity
      // Loss % on Equity / Leverage = Price Move against us
      const maxLossPercent = riskAmount / currentCapital;
      const priceDropPercent = maxLossPercent / effLeverage;

      const stepStopPrice = direction === 'LONG'
        ? currentEntryPrice * (1 - priceDropPercent)
        : currentEntryPrice * (1 + priceDropPercent);

      results.push({
        step: i,
        startAmount: currentCapital,
        profit: profit,
        endAmount: endAmount,
        riskAmount: riskAmount,
        entryPrice: currentEntryPrice,
        targetPrice: stepTargetPrice,
        stopLossPrice: stepStopPrice,
        isSafe: isSafe
      });

      // Assume we roll fully into next trade at the target price
      currentCapital = endAmount;
      currentEntryPrice = stepTargetPrice;
    }
    setCalculatedSteps(results);
  };

  const sendStrategyToTg = async () => {
     const configStr = localStorage.getItem('tg_config');
     if (!configStr) {
       alert("請先設定 Telegram 機器人資訊。");
       return;
     }
     const config = JSON.parse(configStr);
     
     const totalProfit = calculatedSteps.length > 0 ? calculatedSteps[calculatedSteps.length-1].endAmount - initialCapital : 0;
     const totalRoi = (totalProfit / initialCapital) * 100;

     let msg = `🚀 *${symbol} 滾倉策略報告*\n`;
     msg += `--------------------------------\n`;
     msg += `方向: *${direction === 'LONG' ? '🟢 做多 (Long)' : '🔴 做空 (Short)'}*\n`;
     msg += `槓桿: ${leverage}x\n`;
     msg += `本金: $${initialCapital} ➔ 目標: $${calculatedSteps[calculatedSteps.length-1].endAmount.toFixed(0)}\n`;
     msg += `總回報: +${totalRoi.toFixed(0)}%\n\n`;

     calculatedSteps.forEach(step => {
       const icon = step.isSafe ? '🛡️' : '⚠️';
       msg += `*第 ${step.step} 階* ${icon}\n`;
       msg += `進場: $${step.entryPrice.toFixed(2)} ➔ 止盈: $${step.targetPrice.toFixed(2)}\n`;
       msg += `止損: $${step.stopLossPrice.toFixed(2)} (風險: $${step.riskAmount.toFixed(0)})\n`;
       msg += `本階獲利: +$${step.profit.toFixed(0)}\n\n`;
     });
     
     msg += `💡 *此策略僅供參考，請嚴格執行止損*`;

     const sent = await sendTelegramMessage(config, msg);
     if(sent) alert("✅ 滾倉策略已發送至 Telegram!");
     else alert("❌ 發送失敗");
  };

  return (
    <div className="bg-binance-panel p-6 rounded-lg border border-gray-800 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 text-binance-primary border-b border-gray-700 pb-3">
        <Calculator size={20} />
        <h2 className="text-lg font-bold">滾倉攻略 ({symbol.replace('USDT','')})</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
         <div className="col-span-2 flex bg-binance-bg rounded p-1 border border-gray-700">
            <button 
              onClick={() => setDirection('LONG')}
              className={`flex-1 py-1 text-xs font-bold rounded transition-colors flex items-center justify-center gap-1 ${direction === 'LONG' ? 'bg-binance-green text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <ArrowUp size={12} /> 做多 (Long)
            </button>
            <button 
              onClick={() => setDirection('SHORT')}
              className={`flex-1 py-1 text-xs font-bold rounded transition-colors flex items-center justify-center gap-1 ${direction === 'SHORT' ? 'bg-binance-red text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <ArrowDown size={12} /> 做空 (Short)
            </button>
         </div>

        <div>
          <label className="block text-[10px] text-binance-muted mb-1">初始本金 (U)</label>
          <input
            type="number"
            value={initialCapital}
            onChange={(e) => setInitialCapital(Number(e.target.value))}
            className="w-full bg-binance-bg border border-gray-700 rounded p-2 text-white text-xs focus:border-binance-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-binance-muted mb-1 flex justify-between">
            入場價格 ($)
            <button 
               onClick={() => setSyncPrice(!syncPrice)} 
               className={`flex items-center gap-1 text-[9px] ${syncPrice ? 'text-binance-primary' : 'text-gray-500'}`}
               title={syncPrice ? "停止自動更新" : "跟隨即時價格"}
            >
               {syncPrice ? <Link size={10}/> : <Unlock size={10}/>} {syncPrice ? '同步中' : '固定'}
            </button>
          </label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => {
               setEntryPrice(Number(e.target.value));
               setSyncPrice(false); // Disable sync if user types
            }}
            className={`w-full bg-binance-bg border rounded p-2 text-white text-xs outline-none transition-colors ${syncPrice ? 'border-binance-primary/50 text-binance-primary' : 'border-gray-700 focus:border-binance-primary'}`}
          />
        </div>
        <div>
          <label className="block text-[10px] text-binance-muted mb-1">目標漲幅/階 (%)</label>
          <input
            type="number"
            value={profitTarget}
            onChange={(e) => setProfitTarget(Number(e.target.value))}
            className="w-full bg-binance-bg border border-gray-700 rounded p-2 text-white text-xs focus:border-binance-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-binance-muted mb-1">槓桿倍數 (x)</label>
          <input
            type="number"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            max={125}
            className="w-full bg-binance-bg border border-gray-700 rounded p-2 text-white text-xs focus:border-binance-primary outline-none"
          />
        </div>
        <div className="col-span-2">
           <label className="block text-[10px] text-binance-muted mb-1">滾倉階數: {steps}</label>
           <input 
             type="range" 
             min="1" 
             max="10" 
             value={steps} 
             onChange={(e) => setSteps(Number(e.target.value))}
             className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-binance-primary"
           />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {calculatedSteps.map((step) => {
          const intensity = 0.1 + (step.step / steps) * 0.4;
          const borderColor = step.step === 1 ? 'border-gray-700' : 'border-binance-green';

          return (
            <div 
              key={step.step} 
              className={`p-3 rounded border ${borderColor} relative overflow-hidden transition-all hover:scale-[1.02] group`}
              style={{ backgroundColor: `rgba(30, 32, 38, 0.8)` }}
            >
              {/* Background gradient for intensity */}
              <div 
                 className="absolute inset-0 pointer-events-none opacity-20" 
                 style={{ backgroundColor: direction === 'LONG' ? `rgba(14, 203, 129, ${intensity})` : `rgba(246, 70, 93, ${intensity})` }} 
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2 border-b border-gray-700/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-binance-bg text-binance-text w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border border-gray-600 shadow">
                      #{step.step}
                    </span>
                    <div>
                      <div className="text-[10px] text-gray-400">本階本金</div>
                      <div className="font-mono font-bold text-white text-sm">${step.startAmount.toFixed(0)}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                     <div className="text-[10px] text-gray-400">目標資產</div>
                     <div className="font-mono font-bold text-binance-primary text-base">${step.endAmount.toFixed(0)}</div>
                  </div>
                </div>

                {/* Price Targets */}
                <div className="bg-black/40 rounded p-2 mb-2 border border-gray-700/50">
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-gray-400">入場價:</span>
                        <span className="font-mono text-white font-bold">${step.entryPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-center my-1 opacity-50">
                       {direction === 'LONG' ? <ArrowDown size={12} className="text-gray-500 rotate-180"/> : <ArrowDown size={12} className="text-gray-500"/>}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-binance-primary">目標價 (止盈):</span>
                        <span className="font-mono text-binance-primary font-bold">${step.targetPrice.toFixed(2)}</span>
                    </div>
                </div>

                {/* Risk Details */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                   <div className="bg-gray-800/50 rounded p-1 px-2">
                      <div className="text-gray-500">預期利潤</div>
                      <div className="text-binance-green font-mono">+$ {step.profit.toFixed(0)}</div>
                   </div>
                   <div className="bg-gray-800/50 rounded p-1 px-2 text-right">
                      <div className="text-gray-500 flex items-center justify-end gap-1">
                         {step.isSafe ? <ShieldCheck size={10} className="text-green-400"/> : <ShieldAlert size={10} className="text-yellow-400"/>}
                         止損價 (保本)
                      </div>
                      <div className="text-red-300 font-mono">
                         ${step.stopLossPrice.toFixed(2)}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
         <div className="flex justify-between items-center bg-binance-bg p-3 rounded border border-binance-primary/30 shadow-[0_0_10px_rgba(252,213,53,0.1)]">
            <span className="text-binance-muted text-xs">預期總資產規模:</span>
            <span className="text-xl font-bold text-binance-primary">
              ${calculatedSteps.length > 0 ? calculatedSteps[calculatedSteps.length-1].endAmount.toFixed(0) : '0'}
            </span>
         </div>

         <button 
           onClick={sendStrategyToTg}
           className="w-full bg-gray-800 hover:bg-gray-700 text-binance-text border border-gray-600 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors"
         >
           <Send size={12} />
           發送策略到 TG
         </button>
      </div>
    </div>
  );
};

export default RollingCalculator;