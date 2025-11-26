import React, { useState, useEffect } from 'react';
import { TelegramConfig } from '../types';
import { sendTelegramMessage } from '../services/telegramService';
import { Settings, Save, Send, MessageSquare } from 'lucide-react';

const TelegramSettings: React.FC = () => {
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabled: false
  });
  const [isOpen, setIsOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('tg_config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('tg_config', JSON.stringify(config));
    setTestStatus('設定已保存！');
    setTimeout(() => setTestStatus(''), 2000);
  };

  const handleTest = async () => {
    setTestStatus('發送中...');
    const success = await sendTelegramMessage(config, "🔔 CryptoResonance 測試訊息: 連線成功！");
    setTestStatus(success ? '✅ 發送成功！' : '❌ 發送失敗，請檢查 Token/ID');
    setTimeout(() => setTestStatus(''), 3000);
  };

  return (
    <div className="border-t border-gray-800 p-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-binance-muted hover:text-binance-text transition-colors w-full bg-gray-800/50 p-2 rounded"
      >
        <MessageSquare size={16} />
        <span className="text-sm">Telegram 機器人設定</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3 bg-binance-bg p-3 rounded border border-gray-700 animate-in slide-in-from-top-2 fade-in duration-200">
          <div>
            <label className="text-xs text-binance-muted block mb-1">Bot Token</label>
            <input 
              type="password" 
              className="w-full bg-binance-panel border border-gray-700 rounded p-2 text-xs text-white focus:border-binance-primary outline-none"
              value={config.botToken}
              onChange={(e) => setConfig({...config, botToken: e.target.value})}
              placeholder="例如: 123456:ABC-Def..."
            />
          </div>
          <div>
            <label className="text-xs text-binance-muted block mb-1">Chat ID</label>
            <input 
              type="text" 
              className="w-full bg-binance-panel border border-gray-700 rounded p-2 text-xs text-white focus:border-binance-primary outline-none"
              value={config.chatId}
              onChange={(e) => setConfig({...config, chatId: e.target.value})}
              placeholder="例如: -100123456..."
            />
          </div>
          <div className="flex items-center gap-2 py-1">
            <input 
              type="checkbox" 
              checked={config.enabled}
              onChange={(e) => setConfig({...config, enabled: e.target.checked})}
              id="tg-enable"
              className="accent-binance-primary"
            />
            <label htmlFor="tg-enable" className="text-xs text-binance-text cursor-pointer">啟用自動訊號推送</label>
          </div>
          
          <div className="flex gap-2 pt-2">
            <button 
              onClick={handleSave}
              className="flex-1 bg-binance-primary text-black text-xs font-bold py-2 rounded flex items-center justify-center gap-1 hover:brightness-110"
            >
              <Save size={12} /> 保存
            </button>
            <button 
              onClick={handleTest}
              className="flex-1 bg-binance-panel border border-gray-600 text-xs py-2 rounded flex items-center justify-center gap-1 hover:bg-gray-700 text-white"
            >
              <Send size={12} /> 測試
            </button>
          </div>
          {testStatus && <p className="text-xs text-center text-binance-primary font-bold mt-1">{testStatus}</p>}
        </div>
      )}
    </div>
  );
};

export default TelegramSettings;