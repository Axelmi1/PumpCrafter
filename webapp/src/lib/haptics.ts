export function triggerSuccess() {
  try {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  } catch (error) {
    // Haptic feedback not available
  }
}

export function triggerError() {
  try {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }
  } catch (error) {
    // Haptic feedback not available
  }
}

export function triggerImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') {
  try {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  } catch (error) {
    // Haptic feedback not available
  }
}

export function triggerSelectionChanged() {
  try {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) {
      (window as any).Telegram.WebApp.HapticFeedback.selectionChanged();
    }
  } catch (error) {
    // Haptic feedback not available
  }
}

