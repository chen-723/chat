'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { sendImage, uploadFile, sendMessages } from '@/utils/api/messages';

import { Message } from '@/utils/api/messages';

type Props = {
    text: string;
    setText: (t: string) => void;
    handleSend: () => void;
    chatWith: { name: string; id: number; avatar: string | null } | null;
    onMessageSent?: (message: Message) => void;
    isGroupChat?: boolean; // 新增：标识是否为群聊
};

export default function ChatMegSend({ text, setText, handleSend, chatWith, onMessageSent, isGroupChat = false }: Props) {
    const ref = useRef<HTMLTextAreaElement>(null);

    const [isRecording, setIsRecording] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false); // 切换语音/文本模式
    const [recordingDuration, setRecordingDuration] = useState(0); // 录音时长
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [showMore, setShowMore] = useState(false);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMore(false);
            }
        };
        if (showMore) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMore]);

    useEffect(() => {
        if (!ref.current) return;
        ref.current.style.height = 'auto';
        const newHeight = Math.min(ref.current.scrollHeight, 80); // 限制最大高度为 96px (max-h-24)
        ref.current.style.height = newHeight + 'px';
    }, [text]);

    const pickAndSendImage = async () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            const token = localStorage.getItem('token');
            if (!file || !chatWith) return;
            try {
                if (isGroupChat) {
                    // 群聊：上传图片并发送群消息
                    const { uploadFile } = await import('@/utils/api/messages');
                    const { sendGroupMessages } = await import('@/utils/api/groupmessages');
                    const url = await uploadFile(token!, file);
                    const newMsg = await sendGroupMessages(token!, chatWith.id, {
                        content: url,
                        msg_type: 2, // 2=图片
                    });
                    onMessageSent?.(newMsg as any);
                } else {
                    // 私聊
                    const newMsg = await sendImage(token!, chatWith.id, file);
                    onMessageSent?.(newMsg);
                }
            } catch (err) {
                console.error('图片上传失败:', err);
            }
        };
        inp.click();
    };

    const pickAndSendFile = async () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            const token = localStorage.getItem('token');
            if (!file || !chatWith) return;
            try {
                if (isGroupChat) {
                    // 群聊：上传文件并发送群消息
                    const { uploadFile } = await import('@/utils/api/messages');
                    const { sendGroupMessages } = await import('@/utils/api/groupmessages');
                    const url = await uploadFile(token!, file);
                    const newMsg = await sendGroupMessages(token!, chatWith.id, {
                        content: url,
                        msg_type: 4, // 4=文件
                    });
                    onMessageSent?.(newMsg as any);
                } else {
                    // 私聊
                    const url = await uploadFile(token!, file);
                    const newMsg = await sendMessages(token!, {
                        receiver_id: chatWith.id,
                        content: url,
                        msg_type: 4, // 4=文件
                    });
                    onMessageSent?.(newMsg);
                }
            } catch (err) {
                console.error('文件上传失败:', err);
            }
        };
        inp.click();
    };

    //录音开始
    const startRecording = useCallback(async () => {
        try {
            // 请求麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 44100,
                    channelCount: 2,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // 创建 MediaRecorder
            const mimeType = 'audio/webm'; // 大多数浏览器都支持
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 128000 // 128kbps，平衡质量和文件大小
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            recordingStartTimeRef.current = Date.now();
            setRecordingDuration(0);

            // 启动计时器
            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
            }, 100);

            // 收集音频数据
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // 录音停止时的处理
            mediaRecorder.onstop = async () => {
                // 清除计时器
                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                    durationIntervalRef.current = null;
                }

                try {
                    // 合并音频数据
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                    // 检查录音时长（至少1秒）
                    const duration = Date.now() - recordingStartTimeRef.current;
                    if (duration < 1000) {
                        console.log('录音时间太短，已忽略');
                        return;
                    }

                    // 创建文件对象
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const audioFile = new File(
                        [audioBlob],
                        `voice_${timestamp}.webm`,
                        { type: mimeType }
                    );

                    console.log('录音文件创建成功:', audioFile);

                    // 上传到后端
                    const token = localStorage.getItem('token') || ''; // 获取你的token
                    const audioUrl = await uploadFile(token, audioFile);

                    console.log('录音上传成功:', audioUrl);

                    // 发送语音消息
                    if (chatWith) {
                        if (isGroupChat) {
                            const { sendGroupMessages } = await import('@/utils/api/groupmessages');
                            const newMsg = await sendGroupMessages(token, chatWith.id, {
                                content: audioUrl,
                                msg_type: 3, // 3=语音
                            });
                            onMessageSent?.(newMsg as any);
                        } else {
                            const newMsg = await sendMessages(token, {
                                receiver_id: chatWith.id,
                                content: audioUrl,
                                msg_type: 3, // 3=语音
                            });
                            onMessageSent?.(newMsg);
                        }
                    }

                } catch (error) {
                    console.error('处理录音文件失败:', error);
                } finally {
                    // 清理 MediaStream
                    stream.getTracks().forEach(track => track.stop());
                    setIsRecording(false);
                    setRecordingDuration(0);
                }
            };

            // 开始录音
            mediaRecorder.start();
            setIsRecording(true);
            console.log('录音开始');

        }
        catch (error) {
            console.error('录音失败:', error);
            setIsRecording(false);
            setRecordingDuration(0);
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
                durationIntervalRef.current = null;
            }
        }
    }, [chatWith, isGroupChat, onMessageSent]);

    // 结束录音
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            console.log('录音结束');
        }
    }, [isRecording]);

    // 切换语音/文本模式
    const toggleVoiceMode = () => {
        setIsVoiceMode(!isVoiceMode);
        // 切换模式时如果正在录音，停止录音
        if (isRecording) {
            stopRecording();
        }
    };

    // 点击切换录音状态
    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // 清理定时器
    useEffect(() => {
        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        };
    }, []);

    // 拍照（使用系统相机）
    const takePhoto = () => {
        const el = cameraInputRef.current;
        if (!el) return;
        el.value = '';        // 先清空
        el.click();           // 再弹相机
    };

    // 处理拍照后的图片
    const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const token = localStorage.getItem('token');
        if (!file || !chatWith) return;

        try {
            if (isGroupChat) {
                const { uploadFile } = await import('@/utils/api/messages');
                const { sendGroupMessages } = await import('@/utils/api/groupmessages');
                const url = await uploadFile(token!, file);
                const newMsg = await sendGroupMessages(token!, chatWith.id, {
                    content: url,
                    msg_type: 2, // 2=图片
                });
                onMessageSent?.(newMsg as any);
            } else {
                const newMsg = await sendImage(token!, chatWith.id, file);
                onMessageSent?.(newMsg);
            }
        } catch (err) {
            console.error('照片发送失败:', err);
        }

        // 重置 input，允许重复拍照
        if (e.target) {
            e.target.value = '';
        }
    };

    return (
        <div className="w-full text-center border-t border-gray-200 bg-white relative"
            style={{
                paddingTop: '0.875rem',
                paddingBottom: 'calc(2.25rem + env(safe-area-inset-bottom, 0px))'
            }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-b from-black/5 to-transparent" />

            {/* 隐藏的文件输入 */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleCameraCapture}
            />

            <div className="flex items-center mt-1 px-1">
                <div className="flex gap-0.5">
                    {/* 麦克风图标 - 切换语音/文本模式 */}
                    <button
                        onClick={toggleVoiceMode}
                        className={`flex-none w-8 h-8 flex justify-center items-center hover:bg-gray-100 rounded transition-colors ${isVoiceMode ? 'bg-blue-100' : ''
                            }`}
                        title={isVoiceMode ? "切换到文本输入" : "切换到语音输入"}
                    >
                        <svg
                            className="w-5 h-5"
                            fill={isVoiceMode ? "#002DE3" : "#ADB5BD"}
                            viewBox="0 0 1024 1024"
                        >
                            <path
                                d="M490.666667 809.856c-136.149333-10.346667-244.842667-119.04-255.189334-255.189333h42.816C289.066667 674.282667 389.589333 768 512 768s222.933333-93.717333 233.706667-213.333333h42.816c-10.346667 136.149333-119.04 244.842667-255.189334 255.189333V896h170.666667v42.666667H320v-42.666667h170.666667v-86.144zM512 85.333333a192 192 0 0 1 192 192v256a192 192 0 0 1-384 0V277.333333a192 192 0 0 1 192-192z m0 42.666667a149.333333 149.333333 0 0 0-149.333333 149.333333v256a149.333333 149.333333 0 0 0 298.666666 0V277.333333a149.333333 149.333333 0 0 0-149.333333-149.333333z"
                            />
                        </svg>
                    </button>
                </div>

                {/* 文本输入模式 */}
                {!isVoiceMode && (
                    <>
                        <textarea
                            ref={ref}
                            className="flex-1 min-w-0 bg-gray-50 text-sm py-2.5 pl-3 rounded-md focus:outline-none ring-gray-200 focus:ring-1 max-h-24 overflow-y-auto resize-none mx-1"
                            placeholder="请输入文本"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            rows={1}
                        ></textarea>
                        {/* 发送按钮或更多按钮 */}
                        <div className="relative" ref={moreMenuRef}>
                            {text ? (
                                <svg
                                    className="flex-none w-8 h-5 cursor-pointer ml-1"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 20 20"
                                    onClick={handleSend}
                                >
                                    <path
                                        d="M0.0099999905,18C0.0099999905,18,21,9,21,9C21,9,0.0099999905,0,0.0099999905,0C0.0099999905,0,0,7,0,7C0,7,15,9,15,9C15,9,0,11,0,11C0,11,0.0099999905,18,0.0099999905,18C0.0099999905,18,0.0099999905,18,0.0099999905,18Z"
                                        fill="#002DE3"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-8 h-5 cursor-pointer ml-1"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#002DE3"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    onClick={() => setShowMore(prev => !prev)}
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v12M6 12h12" />
                                </svg>
                            )}

                            {/* 悬浮菜单 */}
                            {showMore && !text && (
                                <div className="absolute bottom-full right-0 mb-2 z-50 min-w-32 overflow-hidden rounded-lg border border-gray-200 shadow-lg bg-white">
                                    <div className="flex flex-col divide-y divide-gray-100">
                                        {([
                                            { label: '发送图片', action: 'sendmsg' as const, icon: '🖼️' },
                                            { label: '拍照', action: 'photography' as const, icon: '📷' },
                                            { label: '发送文件', action: 'sendfile' as const, icon: '📁' },
                                        ] as const).map((item) => (
                                            <div
                                                key={item.label}
                                                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log('点击了菜单项:', item.action);

                                                    if (item.action === 'sendmsg') {
                                                        pickAndSendImage();
                                                    } else if (item.action === 'sendfile') {
                                                        pickAndSendFile();
                                                    } else if (item.action === 'photography') {
                                                        takePhoto();
                                                    }
                                                    setShowMore(false);
                                                }}
                                            >
                                                <span className="text-lg">{item.icon}</span>
                                                <span>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* 语音输入模式 */}
                {isVoiceMode && (
                    <div className="flex-1 mx-1 relative">
                        <button
                            onClick={toggleRecording}
                            className={`w-full py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${isRecording
                                ? 'bg-red-500 text-white shadow-lg'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                        >
                            {isRecording ? (
                                <div className="flex items-center justify-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                    </span>
                                    <span>点击结束 {recordingDuration}s</span>
                                </div>
                            ) : (
                                '点击开始录音'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
