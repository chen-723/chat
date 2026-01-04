import { useRef, useCallback } from 'react';

/**
 * 防抖 Hook - 防止短时间内多次触发
 * @param callback 要执行的函数
 * @param delay 延迟时间（毫秒）
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * 节流 Hook - 限制函数执行频率
 * @param callback 要执行的函数
 * @param delay 间隔时间（毫秒）
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
) {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRunRef.current = now;
      } else {
        // 清除之前的延迟调用
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        // 设置新的延迟调用
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRunRef.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  );
}

/**
 * 点击防抖 Hook - 专门用于按钮点击，防止重复提交
 * @param callback 要执行的异步函数
 * @param delay 冷却时间（毫秒）
 */
export function useClickDebounce<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 1000
) {
  const isLoadingRef = useRef<boolean>(false);
  const lastClickRef = useRef<number>(0);

  return useCallback(
    async (...args: Parameters<T>) => {
      const now = Date.now();
      
      // 如果正在加载或距离上次点击时间太短，直接返回
      if (isLoadingRef.current || now - lastClickRef.current < delay) {
        return;
      }

      isLoadingRef.current = true;
      lastClickRef.current = now;

      try {
        await callback(...args);
      } finally {
        isLoadingRef.current = false;
      }
    },
    [callback, delay]
  );
}
