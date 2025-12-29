'use client';
import { useEffect, useState, useCallback, useRef } from "react";
import { getMessages, Message, sendMessages, readMessages } from "@/utils/api/messages";
import { getMe } from "@/utils/api/auth";
import { wsClient } from "@/utils/websocket";
import SERVER_CONFIG from '@/config/server';
import dayjs from 'dayjs';
import ChatMegSend from "./ChatMegSend";
import { getGroupMessages, GroupMessages, sendGroupMessages } from "@/utils/api/groupmessages";
import { getGroupMembers, GroupMembers } from "@/utils/api/group";

type Props = {
    activeMenu: string;
    chatWith: { name: string; id: number; avatar: string | null } | null;
};

export default function ChatWindow({ activeMenu, chatWith }: Props) {

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [user, setUser] = useState({} as any);

    const [groupMembersdata, setGroupMembersdata] = useState<GroupMembers | null>(null)

    // 追踪输入框容器的高度
    const [inputHeight, setInputHeight] = useState(100);
    const inputContainerRef = useRef<HTMLDivElement>(null);

    //区分私聊还是群聊
    const isGroupChat = activeMenu === "群聊天详情";
    const isPrivateChat = activeMenu === "聊天详情";

    //获取用户信息
    const fetchUserData = () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        getMe(token)
            .then(res => setUser(res))
            .catch(() => { });
    };

    // WebSocket消息处理器
    const handleNewMessage = useCallback((data: Message) => {
        // 使用 setMessages 的函数式更新，避免依赖 chatWith
        setMessages(prev => {
            // 检查消息是否属于当前聊天
            const currentChatId = chatWith?.id;
            if (!currentChatId || !isPrivateChat) return prev;

            if (data.sender_id === currentChatId || data.receiver_id === currentChatId) {
                // 如果是收到的消息，自动标记已读
                if (data.sender_id === currentChatId) {
                    const token = localStorage.getItem('token');
                    if (token) {
                        readMessages(token, currentChatId)
                            .then(() => {
                                wsClient.trigger('unread_update');
                            })
                            .catch(() => { });
                    }
                }
                return [...prev, data];
            }
            return prev;
        });
    }, [chatWith?.id, isPrivateChat]);

    // WebSocket群消息处理器
    const handleNewGroupMessage = useCallback((data: GroupMessages) => {
        setMessages(prev => {
            // 检查消息是否属于当前群聊
            const currentGroupId = chatWith?.id;
            if (!currentGroupId || !isGroupChat) return prev;

            if (data.group_id === currentGroupId) {
                const newMsg = mapGroupToPrivate(data);
                return [...prev, newMsg];
            }
            return prev;
        });
    }, [chatWith?.id, isGroupChat]);

    // WebSocket已读回执处理器
    const handleReadReceipt = useCallback((data: { reader_id: number; count: number }) => {
        if (chatWith && data.reader_id === chatWith.id) {
            // 更新消息的已读状态
            setMessages(prev => prev.map(msg =>
                msg.receiver_id === chatWith.id ? { ...msg, is_read: true } : msg
            ));
        }
    }, [chatWith]);

    function mapGroupToPrivate(g: GroupMessages): Message {
        return {
            ...g,
            receiver_id: g.group_id,   // 用 group_id 顶一下 receiver_id，前端只用来渲染列表即可
            // updated_at: g.updated_at,  // 如果 Message 没有 updated_at 就删掉这行
        };
    }

    //渲染后获取聊天历史和用户头像
    useEffect(() => {
        //清除后再获取
        setMessages([]);
        const token = localStorage.getItem('token');
        if (!token || !chatWith || (!isPrivateChat && !isGroupChat)) return;

        // 1. 标记已读（异步，不阻塞），并手动触发未读数更新（仅私聊）
        if (isPrivateChat) {
            readMessages(token, chatWith.id)
                .then(() => {
                    // 手动触发未读数刷新（因为后端的 read_receipt 只发给对方）
                    wsClient.trigger('unread_update');
                })
                .catch(() => { });
        }

        // 2. 拉历史消息
        const fetchMessages = async () => {
            try {
                if (isPrivateChat) {
                    const raw = await getMessages(token, chatWith.id);
                    const sorted = raw.items.sort(
                        (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
                    );
                    setMessages(sorted);
                } else if (isGroupChat) {
                    const GroupMembersdata = await getGroupMembers(token, chatWith.id);
                    setGroupMembersdata(GroupMembersdata);

                    const raw = await getGroupMessages(token, chatWith.id);
                    const sorted = raw.items.sort(
                        (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
                    )
                        .map(mapGroupToPrivate);   //统一转成Message[]
                    setMessages(sorted);
                }
            } catch (e) {
                console.error('获取消息失败:', e);
            }
        };

        fetchMessages();
        // 3. 获取自己的头像
        fetchUserData();

    }, [activeMenu, chatWith, isPrivateChat, isGroupChat]);

    // 单独的 useEffect 用于注册 WebSocket 监听（只注册一次）
    useEffect(() => {
        // 注册WebSocket消息监听
        wsClient.on('new_message', handleNewMessage);
        wsClient.on('read_receipt', handleReadReceipt);
        wsClient.on('new_group_message', handleNewGroupMessage);

        // 清理函数
        return () => {
            wsClient.off('new_message', handleNewMessage);
            wsClient.off('read_receipt', handleReadReceipt);
            wsClient.off('new_group_message', handleNewGroupMessage);
        };
    }, [handleNewMessage, handleReadReceipt, handleNewGroupMessage]);

    //发送消息的函数
    const handleSend = async () => {
        const t = text.trim();   // 直接用组件内的 text 状态
        if (!t || !chatWith) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            if (isPrivateChat) {
                const newMsg = await sendMessages(token, {
                    receiver_id: chatWith.id,
                    content: t,
                    msg_type: 1,
                });
                setMessages(prev => [...prev, newMsg]);
                setText('');          // 清空输入框
            } else if (isGroupChat) {
                const groupMsg = await sendGroupMessages(token, chatWith.id, {
                    content: t,
                    msg_type: 1,
                });
                // 转换为 Message 类型
                const newMsg = mapGroupToPrivate(groupMsg);
                setMessages(prev => [...prev, newMsg]);
                setText('');          // 清空输入框
            }
        } catch (e) {
            console.error(e);
        }
    };

    const prevDateRef = useRef('');

    // 追踪每条消息的错误状态
    const [mediaErrors, setMediaErrors] = useState<Record<number, { image?: boolean; audio?: boolean }>>({});

    // 根据消息类型渲染不同内容
    const renderMessageContent = (msg: Message) => {
        const hasImageError = mediaErrors[msg.id]?.image;
        const hasAudioError = mediaErrors[msg.id]?.audio;

        const handleImageError = () => {
            setMediaErrors(prev => ({
                ...prev,
                [msg.id]: { ...prev[msg.id], image: true }
            }));
        };

        const handleAudioError = () => {
            setMediaErrors(prev => ({
                ...prev,
                [msg.id]: { ...prev[msg.id], audio: true }
            }));
        };

        switch (msg.msg_type) {
            case 1: // 文本消息
                return <span>{msg.content}</span>;

            case 2: // 图片消息
                return hasImageError ? (
                    <span className="text-gray-400 italic">图片已过期</span>
                ) : (
                    <img
                        src={msg.content}
                        alt="图片"
                        className="max-w-[280px] max-h-[280px] w-auto h-auto rounded-lg cursor-pointer object-contain"
                        onClick={() => window.open(msg.content, '_blank')}
                        onError={handleImageError}
                        loading="lazy"
                    />
                );

            case 3: // 语音消息
                return hasAudioError ? (
                    <span className="text-gray-400 italic">语音已过期</span>
                ) : (
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <audio
                            controls
                            className="w-full"
                            onError={handleAudioError}
                        >
                            <source src={msg.content} type="audio/webm" />
                            <source src={msg.content} type="audio/ogg" />
                            <source src={msg.content} type="audio/mpeg" />
                            您的浏览器不支持音频播放
                        </audio>
                    </div>
                );

            case 4: // 文件消息
                const fileName = msg.content.split('/').pop() || '文件';
                return (
                    <a
                        href={msg.content}
                        download
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                        onClick={(e) => {
                            // 检查文件是否存在
                            fetch(msg.content, { method: 'HEAD' })
                                .then(res => {
                                    if (!res.ok) {
                                        e.preventDefault();
                                        alert('文件已过期');
                                    }
                                })
                                .catch(() => {
                                    e.preventDefault();
                                    alert('文件已过期');
                                });
                        }}
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                        </svg>
                        <span>{fileName}</span>
                    </a>
                );

            default:
                return <span>{msg.content}</span>;
        }
    };

    // 监听输入框容器高度变化
    useEffect(() => {
        if (!inputContainerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setInputHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(inputContainerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div>
            {(
                activeMenu === "聊天详情" || activeMenu === "群聊天详情")
                && chatWith &&
                <div className="flex flex-col bg-gray-50 relative" style={{ height: 'calc(100vh - 58px)' }}>

                    <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col min-h-0" style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        paddingBottom: `${inputHeight + 16}px`,
                    }}
                        ref={(node) => {
                            // 每次组件渲染完都把滚动条滚到底
                            if (node) node.scrollTop = node.scrollHeight;
                        }}
                    >
                        {messages.map((item) => {
                            const curDate = dayjs(item.created_at).format('YYYY-MM-DD');
                            const showDivider = curDate !== prevDateRef.current;
                            if (showDivider) prevDateRef.current = curDate;

                            // 私聊：判断是否为对方发送
                            // 群聊：判断是否为自己发送（所有其他人的消息都显示在左侧）
                            const isOtherSender = isPrivateChat
                                ? item.sender_id === chatWith.id
                                : item.sender_id !== user.id;

                            // 群聊时获取发送者信息
                            const senderInfo = isGroupChat && groupMembersdata
                                ? groupMembersdata.find(m => m.user_id === item.sender_id)
                                : null;

                            // 处理头像 URL
                            const getAvatarUrl = (avatar: string | null | undefined) => {
                                if (!avatar) return '/avatar/Profile.png';
                                return avatar.startsWith('http') ? avatar : `${SERVER_CONFIG.API_BASE_URL}${avatar}`;
                            };

                            const otherAvatar = isGroupChat && senderInfo
                                ? getAvatarUrl(senderInfo.avatar)
                                : getAvatarUrl(chatWith.avatar);

                            const myAvatar = getAvatarUrl(user.avatar);

                            return (
                                <div key={item.id}>
                                    {showDivider && (
                                        <div className="flex items-center text-xs text-gray-400 my-2">
                                            <span className="flex-1 border-t border-gray-200" />
                                            <span className="mx-3">
                                                {curDate === dayjs().format('YYYY-MM-DD')
                                                    ? '今天'
                                                    : curDate === dayjs().add(-1, 'day').format('YYYY-MM-DD')
                                                        ? '昨天'
                                                        : dayjs(curDate).format('ddd，MM/DD')}
                                            </span>
                                            <span className="flex-1 border-t border-gray-200" />
                                        </div>
                                    )}

                                    {isOtherSender ? (
                                        <div className="flex items-start mb-4.5">
                                            <img
                                                src={otherAvatar}
                                                alt={
                                                    isGroupChat && senderInfo
                                                        ? senderInfo.username
                                                        : chatWith.name
                                                }
                                                className="w-11 h-11 rounded-lg object-cover mr-2 shrink-0 self-center"
                                            />
                                            <div className="flex flex-col">
                                                {isGroupChat && senderInfo && (
                                                    <span className="text-xs text-gray-500 mb-1 ml-1">
                                                        {senderInfo.username}
                                                    </span>
                                                )}
                                                <div className="relative max-w-xs lg:max-w-md px-4 py-2.5 bg-gray-100 rounded-2xl shadow-sm text-gray-800 text-sm mr-1 wrap-break-word whitespace-pre-wrap flex flex-col">
                                                    {renderMessageContent(item)}
                                                    <time className="text-xs text-gray-400 self-start">
                                                        {dayjs(item.created_at).format('HH:mm')}
                                                    </time>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-end justify-end mb-4.5">
                                            <div className="relative max-w-xs lg:max-w-md px-4 py-2.5 bg-blue-200 rounded-2xl shadow-sm text-gray-800 text-sm mr-1 wrap-break-word whitespace-pre-wrap">
                                                {renderMessageContent(item)}
                                                <div className="self-end mr-1 flex flex-row justify-end">
                                                    <time className="text-xs text-gray-400">
                                                        {dayjs(item.created_at).format('HH:mm')}
                                                    </time>
                                                    {isPrivateChat && item.is_read === true && (
                                                        <div className="text-xs text-gray-400 ml-2.5">已读</div>
                                                    )}
                                                </div>
                                            </div>
                                            <img
                                                src={myAvatar}
                                                alt={user.name}
                                                className="w-11 h-11 rounded-lg object-cover shrink-0 self-center"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* 消息发送组件 */}
                    <div ref={inputContainerRef} className="absolute bottom-0 left-0 right-0">
                        <ChatMegSend
                            text={text}
                            setText={setText}
                            handleSend={handleSend}
                            chatWith={chatWith}
                            onMessageSent={(msg) => setMessages(prev => [...prev, msg])}
                            isGroupChat={isGroupChat}
                        />
                    </div>
                </div>
            }
        </div>
    )
}