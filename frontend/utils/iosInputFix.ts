// iOS 输入框修复工具
// 防止输入时页面缩放和出现滚动条

export function setupIOSInputFix() {
  // 仅在 iOS 设备上运行
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  if (!isIOS) return;

  let originalViewportContent = '';
  
  // 监听所有输入框的焦点事件
  const handleFocus = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      // 保存原始 viewport
      const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
      if (viewport) {
        originalViewportContent = viewport.content;
        // 强制设置 viewport，防止缩放
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      }
      
      // 防止页面滚动
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      
      // 滚动到输入框位置
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };
  
  const handleBlur = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      // 恢复原始 viewport
      const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
      if (viewport && originalViewportContent) {
        viewport.content = originalViewportContent;
      }
      
      // 恢复页面滚动
      document.body.style.position = '';
      document.body.style.width = '';
      
      // 滚动回顶部，防止页面错位
      window.scrollTo(0, 0);
    }
  };
  
  // 添加事件监听
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
  
  // 防止双击缩放
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // 返回清理函数
  return () => {
    document.removeEventListener('focus', handleFocus, true);
    document.removeEventListener('blur', handleBlur, true);
  };
}
