import { TelegramConfig } from '../types';

export const sendTelegramMessage = async (config: TelegramConfig, message: string): Promise<boolean> => {
  if (!config.enabled || !config.botToken || !config.chatId) {
    console.warn("Telegram not configured or disabled");
    return false;
  }

  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown'
      }),
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error("Telegram send error:", error);
    return false;
  }
};
