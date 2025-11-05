export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function initTelegramSDK() {
  try {
    // Check if running in Telegram
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      console.log('✅ Telegram SDK initialized');
      console.log('User from WebApp:', tg.initDataUnsafe?.user);
      console.log('InitData available:', !!tg.initData);
      
      return {
        initDataRaw: tg.initData || '',
        user: tg.initDataUnsafe?.user || null,
      };
    }
  } catch (error) {
    console.error('Failed to initialize Telegram SDK:', error);
  }
  
  // Return mock data for development
  console.warn('⚠️  Running in development mode without Telegram SDK');
  return {
    initDataRaw: '',
    user: null,
  };
}

export function getTelegramTheme() {
  try {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      return {
        bgColor: tg.themeParams.bg_color || '#1a1f2e',
        textColor: tg.themeParams.text_color || '#ffffff',
        hintColor: tg.themeParams.hint_color || '#6c7a89',
        linkColor: tg.themeParams.link_color || '#8b7ec8',
        buttonColor: tg.themeParams.button_color || '#8b7ec8',
        buttonTextColor: tg.themeParams.button_text_color || '#ffffff',
      };
    }
  } catch (error) {
    console.error('Failed to get theme:', error);
  }
  
  // Fallback theme for development
  return {
    bgColor: '#1a1f2e',
    textColor: '#ffffff',
    hintColor: '#6c7a89',
    linkColor: '#8b7ec8',
    buttonColor: '#8b7ec8',
    buttonTextColor: '#ffffff',
  };
}

export function getLaunchParams() {
  try {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      const initDataRaw = tg.initData || '';
      const user = tg.initDataUnsafe?.user || null;
      
      console.log('✅ Launch params from Telegram:');
      console.log('  - User ID:', user?.id);
      console.log('  - Username:', user?.username);
      console.log('  - initDataRaw length:', initDataRaw.length);
      
      return {
        initDataRaw,
        initData: {
          user,
        },
      };
    }
  } catch (error) {
    console.error('Failed to get launch params:', error);
  }
  
  console.warn('⚠️  No Telegram WebApp detected - using fallback');
  return {
    initDataRaw: '',
    initData: {
      user: null,
    },
  };
}

