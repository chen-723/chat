'use client';
import { useState, useEffect } from 'react';
import { usePWA } from '@/utils/usePWA';

export default function PWAPrompt() {
    const { isPWA, isIOS, isAndroid } = usePWA();
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // 如果已经是 PWA 模式，不显示提示
        if (isPWA) {
            setShowPrompt(false);
            return;
        }

        // 检查用户是否已经关闭过提示（24小时内不再显示）
        const lastDismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (lastDismissed) {
            const dismissedTime = parseInt(lastDismissed);
            const now = Date.now();
            // const hoursPassed = (now - dismissedTime) / (1000 * 60 * 60);

            // if (hoursPassed < 24) {
            //     return;
            // }
        }

        // 延迟显示提示，避免干扰用户
        const timer = setTimeout(() => {
            setShowPrompt(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, [isPWA]);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    };

    if (!showPrompt || isPWA) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="text-center">
                    <div className="text-4xl mb-4">📱</div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        安装应用以获得最佳体验
                    </h2>
                    <p className="text-gray-600 text-sm mb-6">
                        将此应用添加到主屏幕，享受更流畅的使用体验
                    </p>

                    {/* iOS 安装说明 */}
                    {isIOS && (
                        <div className="bg-blue-50 rounded-lg p-4 mb-4 text-left">
                            <p className="text-sm text-gray-700 mb-2 font-semibold">iOS 安装步骤：</p>
                            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                                <li>点击底部的 <span className="font-bold">分享</span> 按钮 (⬆️)</li>
                                <li>向下滚动找到 <span className="font-bold">"添加到主屏幕"</span></li>
                                <li>点击 <span className="font-bold">"添加"</span> 完成安装</li>
                            </ol>
                        </div>
                    )}

                    {/* Android 安装说明 */}
                    {isAndroid && (
                        <div className="bg-green-50 rounded-lg p-4 mb-4 text-left">
                            <p className="text-sm text-gray-700 mb-2 font-semibold">Android 安装步骤：</p>
                            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                                <li>点击浏览器菜单 (⋮)</li>
                                <li>选择 <span className="font-bold">"添加到主屏幕"</span> 或 <span className="font-bold">"安装应用"</span></li>
                                <li>点击 <span className="font-bold">"安装"</span> 完成</li>
                            </ol>
                        </div>
                    )}

                    {/* 桌面浏览器提示 */}
                    {!isIOS && !isAndroid && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                            <p className="text-sm text-gray-700 mb-2">
                                请在移动设备上访问以安装应用
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                        >
                            稍后再说
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
                        >
                            知道了
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
