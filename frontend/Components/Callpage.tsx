'use client';
import { useState, useEffect, useRef } from 'react';
import { wsClient } from '@/utils/websocket';
import { AudioManager } from '@/utils/audioManager';
import { getMe } from '@/utils/api/auth';
import SERVER_CONFIG from '@/config/server';

type Props = {
    activeMenu: string;
    setActiveMenu: (menu: string) => void,
    chatWith: { name: string; id: number; avatar: string | null } | null;
};

export default function Callpage({ activeMenu, chatWith, setActiveMenu }: Props) {
    const [callStatus, setCallStatus] = useState<'calling' | 'incoming' | 'connected' | 'ended'>('calling');
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [incomingCall, setIncomingCall] = useState<{
        caller_id: number;
        caller_name: string;
        caller_avatar: string | null;
    } | null>(null);
    const [user, setUser] = useState<any>(null);
    const [currentCallPeerId, setCurrentCallPeerId] = useState<number | null>(null); // 追踪当前通话对象

    const audioManagerRef = useRef<AudioManager | null>(null);
    const callTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isMutedRef = useRef(false); // 使用 ref 来存储静音状态

    // 获取当前用户信息
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            getMe(token).then(setUser).catch(console.error);
        }
    }, []);

    // 发起通话
    useEffect(() => {
        if (activeMenu === "发起通话" && chatWith && user) {
            setCallStatus('calling');
            setCurrentCallPeerId(chatWith.id);
            wsClient.send({
                type: 'voice_call_request',
                to_user_id: chatWith.id,
                caller_name: user?.username || '未知',
                caller_avatar: user?.avatar || null,
            });
        }
    }, [activeMenu, chatWith, user]);

    // 监听通话相关事件
    useEffect(() => {
        // 来电
        const handleIncomingCall = (data: any) => {
            // 使用 currentCallPeerId 来判断是否正在通话
            // 如果 currentCallPeerId 不为 null，说明正在通话或呼叫中
            setCurrentCallPeerId(prevPeerId => {
                if (prevPeerId !== null) {
                    // 正在通话中，自动拒绝新来电
                    wsClient.send({
                        type: 'voice_call_reject',
                        caller_id: data.caller_id,
                    });
                    return prevPeerId; // 保持当前状态
                }

                // 没有通话，接受来电
                setIncomingCall({
                    caller_id: data.caller_id,
                    caller_name: data.caller_name,
                    caller_avatar: data.caller_avatar,
                });
                setCallStatus('incoming');

                // 使用 setTimeout 避免在渲染期间更新父组件
                setTimeout(() => {
                    setActiveMenu('来电');
                }, 0);

                return data.caller_id; // 设置新的通话对象
            });
        };

        // 通话被取消（对方在接通前挂断）
        const handleCallCancelled = (data: any) => {
            if (callStatus === 'incoming') {
                alert(data.reason || '对方已取消通话');
                endCall();
            }
        };

        // 通话接通
        const handleCallConnected = async (data: any) => {
            setCallStatus('connected');

            // 使用 setTimeout 避免在渲染期间更新父组件
            setTimeout(() => {
                setActiveMenu('通话中');
            }, 0);

            // 初始化音频管理器
            audioManagerRef.current = new AudioManager();
            await audioManagerRef.current.init();

            // 开始采集音频并发送
            await audioManagerRef.current.startCapture((audioData) => {
                if (!isMutedRef.current) {
                    wsClient.sendBinary(audioData);
                }
            });

            // 开始计时
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        };

        // 通话被拒绝
        const handleCallRejected = (data: any) => {
            alert(data.reason || '对方拒绝了通话');
            endCall();
        };

        // 对方忙线
        const handleCallBusy = (data: any) => {
            alert(data.reason || '对方正在通话中');
            endCall();
        };

        // 通话失败
        const handleCallFailed = (data: any) => {
            alert(data.reason || '通话失败');
            endCall();
        };

        // 通话结束
        const handleCallEnded = (data: any) => {
            alert(data.reason || '通话已结束');
            endCall();
        };

        // 接收音频数据
        const handleAudioData = async (audioData: ArrayBuffer | Blob) => {
            if (audioManagerRef.current && callStatus === 'connected') {
                await audioManagerRef.current.playAudio(audioData);
            }
        };

        wsClient.on('voice_call_incoming', handleIncomingCall);
        wsClient.on('voice_call_cancelled', handleCallCancelled);
        wsClient.on('voice_call_connected', handleCallConnected);
        wsClient.on('voice_call_rejected', handleCallRejected);
        wsClient.on('voice_call_busy', handleCallBusy);
        wsClient.on('voice_call_failed', handleCallFailed);
        wsClient.on('voice_call_ended', handleCallEnded);
        wsClient.on('audio_data', handleAudioData);

        return () => {
            wsClient.off('voice_call_incoming', handleIncomingCall);
            wsClient.off('voice_call_cancelled', handleCallCancelled);
            wsClient.off('voice_call_connected', handleCallConnected);
            wsClient.off('voice_call_rejected', handleCallRejected);
            wsClient.off('voice_call_busy', handleCallBusy);
            wsClient.off('voice_call_failed', handleCallFailed);
            wsClient.off('voice_call_ended', handleCallEnded);
            wsClient.off('audio_data', handleAudioData);
        };
    }, [callStatus, isMuted, setActiveMenu]);

    // 接听通话
    const acceptCall = () => {
        if (incomingCall) {
            wsClient.send({
                type: 'voice_call_accept',
                caller_id: incomingCall.caller_id,
                receiver_name: user?.username || '未知',
                receiver_avatar: user?.avatar || null,
            });
        }
    };

    // 拒绝通话
    const rejectCall = () => {
        if (incomingCall) {
            wsClient.send({
                type: 'voice_call_reject',
                caller_id: incomingCall.caller_id,
            });
            endCall();
        }
    };

    // 挂断通话
    const hangup = () => {
        // 如果是呼叫中状态，发送取消消息
        if (callStatus === 'calling' && chatWith) {
            wsClient.send({
                type: 'voice_call_cancel',
                receiver_id: chatWith.id,
            });
        } else {
            // 如果是通话中，发送挂断消息
            wsClient.send({
                type: 'voice_call_hangup',
            });
        }
        endCall();
    };

    // 结束通话并清理资源
    const endCall = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }

        if (audioManagerRef.current) {
            audioManagerRef.current.cleanup();
            audioManagerRef.current = null;
        }

        setCallDuration(0);
        setCallStatus('ended');
        setIncomingCall(null);
        setCurrentCallPeerId(null); // 清除通话对象
        setActiveMenu('联系人详情');
    };

    // 切换静音
    const toggleMute = () => {
        setIsMuted(!isMuted);
        isMutedRef.current = !isMuted; // 同步更新 ref
    };

    // 格式化通话时长
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 处理头像 URL
    const getAvatarUrl = (avatar: string | null | undefined) => {
        if (!avatar) return '/avatar/Profile.png';
        return avatar.startsWith('http') ? avatar : `${SERVER_CONFIG.API_BASE_URL}${avatar}`;
    };

    // 发起通话界面
    if (activeMenu === "发起通话" && callStatus === 'calling') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-linear-to-b from-blue-50 to-white">
                <div className='flex justify-center mt-15'>
                    <div className="relative inline-block">
                        <img
                            src={getAvatarUrl(chatWith?.avatar)}
                            alt={chatWith?.name}
                            className="w-[100px] h-[100px] rounded-lg object-cover"
                        />
                    </div>
                </div>
                <div className='flex justify-center mt-6 font-bold text-xl'>
                    {chatWith?.name}
                </div>
                <div className='flex justify-center mt-6 text-gray-500'>
                    呼叫中...
                </div>
                <div className='flex justify-center mt-25'>
                    <button
                        className='w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors'
                        onClick={hangup}
                    >
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    // 来电界面
    if (activeMenu === "来电" && callStatus === 'incoming' && incomingCall) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-linear-to-b from-green-50 to-white">
                <div className='flex justify-center mt-15'>
                    <div className="relative inline-block">
                        <img
                            src={getAvatarUrl(incomingCall.caller_avatar)}
                            alt={incomingCall.caller_name}
                            className="w-[100px] h-[100px] rounded-lg object-cover animate-pulse"
                        />
                    </div>
                </div>
                <div className='flex justify-center mt-6 font-bold text-xl'>
                    {incomingCall.caller_name}
                </div>
                <div className='flex justify-center mt-6 text-gray-500'>
                    语音通话邀请...
                </div>
                <div className='flex justify-center gap-10 mt-25'>
                    {/* 拒绝按钮 */}
                    <button
                        className='w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors'
                        onClick={rejectCall}
                    >
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                        </svg>
                    </button>
                    {/* 接听按钮 */}
                    <button
                        className='w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors'
                        onClick={acceptCall}
                    >
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    // 通话中界面
    if (activeMenu === "通话中" && callStatus === 'connected') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-linear-to-b from-blue-50 to-white">
                <div className='flex justify-center mt-15'>
                    <div className="relative inline-block">
                        <img
                            src={getAvatarUrl(chatWith?.avatar || incomingCall?.caller_avatar)}
                            alt={chatWith?.name || incomingCall?.caller_name}
                            className="w-[100px] h-[100px] rounded-lg object-cover"
                        />
                    </div>
                </div>
                <div className='flex justify-center mt-6 font-bold text-xl'>
                    {chatWith?.name || incomingCall?.caller_name}
                </div>
                <div className='flex justify-center mt-6 text-gray-500 text-lg'>
                    {formatDuration(callDuration)}
                </div>
                <div className='flex justify-center gap-6 mt-25'>
                    <button
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        onClick={toggleMute}
                    >
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            {isMuted ? (
                                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                            ) : (
                                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                            )}
                        </svg>
                    </button>
                    {/* 挂断按钮 */}
                    <button
                        className='w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors'
                        onClick={hangup}
                    >
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
