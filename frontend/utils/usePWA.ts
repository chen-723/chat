import { useState, useEffect } from 'react';

export function usePWA() {
  const [isPWA, setIsPWA] = useState(true); // 默认为 true，避免闪烁
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // 检测是否在 PWA 模式下运行
    const checkPWA = () => {
      // 方法1: 检查 display-mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      
      // 方法2: 检查 iOS PWA
      const isIOSPWA = (window.navigator as any).standalone === true;
      
      // 方法3: 检查 Android PWA
      const isAndroidPWA = document.referrer.includes('android-app://');
      
      return isStandalone || isIOSPWA || isAndroidPWA;
    };

    // 检测设备类型
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);

    setIsIOS(iOS);
    setIsAndroid(android);
    setIsPWA(checkPWA());
  }, []);

  return { isPWA, isIOS, isAndroid };
}
