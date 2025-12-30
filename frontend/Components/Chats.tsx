'use client';
import { useState, useEffect, useCallback } from 'react';
import { Contact, getContacts } from '@/utils/api/contact';
import { getMessages, Message } from '@/utils/api/messages';
import { getGroups, Groups } from '@/utils/api/group';
import { wsClient } from '@/utils/websocket';
import SERVER_CONFIG from '@/config/server';

type Props = {
    activeMenu: string;
    setActiveMenu: (m: '聊天' | '聊天详情' | '群聊天详情') => void;
    setChatWith: (chat: { name: string; id: number; avatar: string | null }) => void;
    setFrom: (from: '联系人' | '聊天' | '用户') => void;
    groupsRefreshTrigger?: number;
    onUnreadChange?: (privateUnread: number, groupUnread: number) => void;
};

type ContactWithLastMessage = Contact & {
    lastMessageContent?: string;
    lastMessageTime?: string;
    lastMessageType?: number;
};

type GroupWithLastMessage = Groups & {
    lastMessageContent?: string;
    lastMessageTime?: string;
    lastMessageType?: number;
    unreadCount?: number;
};

export default function Chats({ activeMenu, setActiveMenu, setChatWith, setFrom, groupsRefreshTrigger, onUnreadChange }: Props) {
    //获取设置联系人数组
    const [contacts, setContacts] = useState<ContactWithLastMessage[]>([]);
    const [groups, setGroups] = useState<GroupWithLastMessage[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // 获取当前用户ID
    useEffect(() => {
        const fetchCurrentUser = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const { getMe } = await import('@/utils/api/auth');
                const user = await getMe(token);
                setCurrentUserId(user.id);
            } catch (error) {
                console.error("获取当前用户失败:", error);
            }
        };

        fetchCurrentUser();
    }, []);

    // WebSocket新消息处理器 - 更新聊天列表和未读数
    const handleNewMessage = useCallback((data: Message) => {
        setContacts(prev => {
            const updated = prev.map(contact => {
                // 判断消息是否与该联系人相关
                const isSentToContact = data.sender_id === currentUserId && data.receiver_id === contact.user_id;
                const isReceivedFromContact = data.sender_id === contact.user_id && data.receiver_id === currentUserId;

                if (isSentToContact || isReceivedFromContact) {
                    return {
                        ...contact,
                        lastMessageContent: data.content,
                        lastMessageTime: data.created_at,
                        lastMessageType: data.msg_type,
                        // 只有收到的消息才增加未读数
                        count: isReceivedFromContact ? (contact.count || 0) + 1 : contact.count,
                    };
                }
                return contact;
            });

            // 按最新消息时间排序
            return updated.sort((a, b) => {
                const timeA = a.lastMessageTime ? +new Date(a.lastMessageTime) : 0;
                const timeB = b.lastMessageTime ? +new Date(b.lastMessageTime) : 0;
                return timeB - timeA;
            });
        });
    }, [currentUserId]);

    // WebSocket群消息处理器 - 刷新群列表
    const handleNewGroupMessage = useCallback(async (data: any) => {
        // 如果没有 data 或 group_id，说明是手动触发的刷新事件，重新获取群列表
        if (!data || !data.group_id) {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const { getGroupMessages } = await import('@/utils/api/groupmessages');
                const groupsdata = await getGroups(token);

                const groupsWithMessages = await Promise.all(
                    groupsdata.map(async (group): Promise<GroupWithLastMessage> => {
                        try {
                            const messages = await getGroupMessages(token, group.id);
                            if (messages.items && messages.items.length > 0) {
                                const sorted = messages.items.sort(
                                    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
                                );
                                const lastMsg = sorted[0];
                                return {
                                    ...group,
                                    lastMessageContent: lastMsg.content,
                                    lastMessageTime: lastMsg.created_at,
                                    lastMessageType: lastMsg.msg_type,
                                    unreadCount: 0,
                                };
                            }
                            return { ...group, unreadCount: 0 };
                        } catch (error) {
                            console.error(`获取群 ${group.id} 的消息失败:`, error);
                            return { ...group, unreadCount: 0 };
                        }
                    })
                );

                const sortedGroups = groupsWithMessages.sort((a, b) => {
                    const timeA = a.lastMessageTime ? +new Date(a.lastMessageTime) : 0;
                    const timeB = b.lastMessageTime ? +new Date(b.lastMessageTime) : 0;
                    return timeB - timeA;
                });

                setGroups(sortedGroups);
            } catch (error) {
                console.error("刷新群列表失败:", error);
            }
            return;
        }

        // 更新群聊的最后消息和未读数
        setGroups(prev => {
            const updated = prev.map(group => {
                if (group.id === data.group_id) {
                    return {
                        ...group,
                        lastMessageContent: data.content,
                        lastMessageTime: data.created_at,
                        lastMessageType: data.msg_type,
                        // 如果不是自己发的消息，增加未读数
                        unreadCount: data.sender_id !== currentUserId
                            ? (group.unreadCount || 0) + 1
                            : group.unreadCount,
                    };
                }
                return group;
            });

            // 按最新消息时间排序
            return updated.sort((a, b) => {
                const timeA = a.lastMessageTime ? +new Date(a.lastMessageTime) : 0;
                const timeB = b.lastMessageTime ? +new Date(b.lastMessageTime) : 0;
                return timeB - timeA;
            });
        });
    }, [currentUserId]);

    // WebSocket群成员添加处理器 - 刷新群列表
    const handleGroupMemberAdded = useCallback(async (data: any) => {
        console.log("被添加到群聊:", data);
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const groupsdata = await getGroups(token);
            setGroups(groupsdata);
        } catch (error) {
            console.error("刷新群列表失败:", error);
        }
    }, []);

    // WebSocket已读回执处理器 - 清除未读数
    const handleReadReceipt = useCallback((data: { reader_id: number; count: number }) => {
        setContacts(prev => prev.map(contact => {
            // 如果是该联系人读取了消息，清零未读数
            if (contact.user_id === data.reader_id) {
                return {
                    ...contact,
                    count: 0,
                };
            }
            return contact;
        }));
    }, []);

    // WebSocket用户上线处理器
    const handleUserOnline = useCallback((data: { user_id: number }) => {
        setContacts(prev => prev.map(contact => {
            if (contact.user_id === data.user_id) {
                return {
                    ...contact,
                    status: 'online' as const,
                };
            }
            return contact;
        }));
    }, []);

    // WebSocket用户下线处理器
    const handleUserOffline = useCallback((data: { user_id: number }) => {
        setContacts(prev => prev.map(contact => {
            if (contact.user_id === data.user_id) {
                return {
                    ...contact,
                    status: 'offline' as const,
                };
            }
            return contact;
        }));
    }, []);

    // WebSocket在线用户列表处理器（连接时接收）
    const handleOnlineUsers = useCallback((data: { user_ids: number[] }) => {
        setContacts(prev => prev.map(contact => {
            if (data.user_ids.includes(contact.user_id)) {
                return {
                    ...contact,
                    status: 'online' as const,
                };
            }
            return contact;
        }));
    }, []);

    // 获取联系人列表和最后消息
    useEffect(() => {
        const fetchContactsWithMessages = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                // 获取群聊列表和最后消息
                const { getGroupMessages } = await import('@/utils/api/groupmessages');
                const groupsdata = await getGroups(token);

                const groupsWithMessages = await Promise.all(
                    groupsdata.map(async (group): Promise<GroupWithLastMessage> => {
                        try {
                            const messages = await getGroupMessages(token, group.id);
                            if (messages.items && messages.items.length > 0) {
                                const sorted = messages.items.sort(
                                    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
                                );
                                const lastMsg = sorted[0];
                                return {
                                    ...group,
                                    lastMessageContent: lastMsg.content,
                                    lastMessageTime: lastMsg.created_at,
                                    lastMessageType: lastMsg.msg_type,
                                    unreadCount: 0, // 初始未读数为0
                                };
                            }
                            return { ...group, unreadCount: 0 };
                        } catch (error) {
                            console.error(`获取群 ${group.id} 的消息失败:`, error);
                            return { ...group, unreadCount: 0 };
                        }
                    })
                );

                // 按最新消息时间排序群聊列表
                const sortedGroups = groupsWithMessages.sort((a, b) => {
                    const timeA = a.lastMessageTime ? +new Date(a.lastMessageTime) : 0;
                    const timeB = b.lastMessageTime ? +new Date(b.lastMessageTime) : 0;
                    return timeB - timeA;
                });

                setGroups(sortedGroups);
            } catch (error) {
                console.error("获取群聊失败:", error);
            }

            try {
                const data = await getContacts(token);
                // 为每个联系人获取最后一条消息
                const contactsWithMessages = await Promise.all(
                    data.map(async (contact) => {
                        try {
                            const messages = await getMessages(token, contact.user_id);
                            if (messages.items && messages.items.length > 0) {
                                // 按时间排序，获取最新的消息
                                const sorted = messages.items.sort(
                                    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
                                );
                                const lastMsg = sorted[0];
                                return {
                                    ...contact,
                                    lastMessageContent: lastMsg.content,
                                    lastMessageTime: lastMsg.created_at,
                                    lastMessageType: lastMsg.msg_type,
                                };
                            }
                            return contact;
                        } catch (error) {
                            console.error(`获取联系人 ${contact.user_id} 的消息失败:`, error);
                            return contact;
                        }
                    })
                );

                // 按最新消息时间排序联系人列表
                const sortedContacts = contactsWithMessages.sort((a, b) => {
                    const timeA = (a as ContactWithLastMessage).lastMessageTime ? +new Date((a as ContactWithLastMessage).lastMessageTime!) : 0;
                    const timeB = (b as ContactWithLastMessage).lastMessageTime ? +new Date((b as ContactWithLastMessage).lastMessageTime!) : 0;
                    return timeB - timeA;
                });

                setContacts(sortedContacts);
            } catch (error) {
                console.error("获取联系人失败:", error);
            }
        };

        if (activeMenu === '聊天') {
            fetchContactsWithMessages();
        }
    }, [activeMenu, groupsRefreshTrigger]);

    // 单独的 useEffect 用于注册 WebSocket 监听
    useEffect(() => {
        // 注册WebSocket消息监听
        wsClient.on('new_message', handleNewMessage);
        wsClient.on('read_receipt', handleReadReceipt);
        wsClient.on('new_group_message', handleNewGroupMessage);
        wsClient.on('group_member_added', handleGroupMemberAdded);
        wsClient.on('group_list_update', handleNewGroupMessage);
        wsClient.on('user_online', handleUserOnline);
        wsClient.on('user_offline', handleUserOffline);
        wsClient.on('online_users', handleOnlineUsers); // 接收在线用户列表

        return () => {
            wsClient.off('new_message', handleNewMessage);
            wsClient.off('read_receipt', handleReadReceipt);
            wsClient.off('new_group_message', handleNewGroupMessage);
            wsClient.off('group_member_added', handleGroupMemberAdded);
            wsClient.off('group_list_update', handleNewGroupMessage);
            wsClient.off('user_online', handleUserOnline);
            wsClient.off('user_offline', handleUserOffline);
            wsClient.off('online_users', handleOnlineUsers);
        };
    }, [handleNewMessage, handleReadReceipt, handleNewGroupMessage, handleGroupMemberAdded, handleUserOnline, handleUserOffline, handleOnlineUsers]);

    const favoriteList = [
        ...contacts.filter(c => c.is_favorite === true),
    ];

    // 合并群聊和私聊，统一按时间排序
    const allChats = [
        ...groups.map(g => ({ ...g, type: 'group' as const })),
        ...contacts.filter(c => c.lastMessageContent || c.lastMeg).map(c => ({ ...c, type: 'contact' as const }))
    ].sort((a, b) => {
        const timeA = a.lastMessageTime ? +new Date(a.lastMessageTime) : 0;
        const timeB = b.lastMessageTime ? +new Date(b.lastMessageTime) : 0;
        return timeB - timeA;
    });

    // 计算并上报未读数
    useEffect(() => {
        if (onUnreadChange) {
            const privateUnread = contacts.reduce((sum, c) => sum + (c.count || 0), 0);
            const groupUnread = groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);
            onUnreadChange(privateUnread, groupUnread);
        }
    }, [contacts, groups, onUnreadChange]);

    // 处理头像 URL
    const getAvatarUrl = (avatar: string | null | undefined) => {
        if (!avatar) return '/avatar/Profile.png';
        return avatar.startsWith('http') ? avatar : `${SERVER_CONFIG.API_BASE_URL}${avatar}`;
    };

    return (
        <div className=''>
            {activeMenu === '聊天' &&
                <div>
                    {/* 特别关心 */}
                    <div className="flex flex-row gap-3 overflow-x-auto scrollbar-hide ml-4">
                        {favoriteList.map(item => (
                            <div
                                key={item.id}
                                className="flex flex-col items-center shrink-0 ml-1 mb-1 cursor-pointer"
                                onClick={() => {
                                    setChatWith({ name: item.name, id: item.user_id, avatar: item.avatar });
                                    setActiveMenu('聊天详情');
                                    setFrom('聊天');
                                }}
                            >
                                <div className="relative shrink-0">
                                    <img
                                        src={getAvatarUrl(item.avatar)}
                                        alt={item.name}
                                        width={48}
                                        height={48}
                                        className="w-12 h-12 rounded-lg object-cover"
                                    />
                                    {item.status === 'online' && (
                                        <span className="absolute -bottom-1 left-9.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                    )}
                                    {item.count !== 0 && item.count !== null && (
                                        <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-lg">
                                            {item.count}
                                        </div>
                                    )}
                                </div>
                                <div className="text-xs mt-1">{item.name}</div>
                            </div>
                        ))}
                    </div>
                    {/* 详细列表 */}
                    <div
                        className={
                            `flex flex-col mt-2 space-y-3 w-full overflow-y-auto scrollbar-hide ${favoriteList.length > 0
                                ? 'max-h-[calc(100vh-239px)]'
                                : 'max-h-[calc(100vh-167px)]'
                            }`
                        }
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}>
                        {/* 统一渲染群聊和私聊 */}
                        {allChats.map((item) => {
                            if (item.type === 'group') {
                                // 群聊渲染
                                let displayMessage = item.lastMessageContent;
                                if (item.lastMessageType === 2) {
                                    displayMessage = '[图片]';
                                } else if (item.lastMessageType === 3) {
                                    displayMessage = '[语音]';
                                } else if (item.lastMessageType === 4) {
                                    displayMessage = '[文件]';
                                }

                                const displayTime = item.lastMessageTime
                                    ? new Date(item.lastMessageTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                                    : null;

                                return (
                                    <div key={`group-${item.id}`}>
                                        <div className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0"
                                            onClick={() => {
                                                setChatWith({ name: item.name, id: item.id, avatar: item.avatar });
                                                setActiveMenu('群聊天详情');
                                                setFrom('聊天');

                                                // 点击进入聊天时，立即清零未读数（UI优化）
                                                setGroups(prev => prev.map(g =>
                                                    g.id === item.id ? { ...g, unreadCount: 0 } : g
                                                ));
                                            }}>
                                            {/* 头像 */}
                                            <div className="relative shrink-0 ml-3">
                                                <img
                                                    src={getAvatarUrl(item.avatar)}
                                                    alt={item.name}
                                                    width={48}
                                                    height={48}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            </div>

                                            {/* 右侧信息 */}
                                            <div className='flex flex-1 min-w-0 justify-between gap-2'>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-gray-700 font-semibold truncate">{item.name}</p>
                                                    {displayMessage && (
                                                        <p className="text-sm text-gray-300 truncate">
                                                            {displayMessage}
                                                        </p>
                                                    )}
                                                </div>

                                                {displayTime && (
                                                    <div className={`shrink-0 mr-3 text-sm flex flex-col items-end ${item.unreadCount ? 'text-gray-700 font-bold' : 'text-gray-300'}`}>
                                                        {displayTime}
                                                        {item.unreadCount !== 0 && item.unreadCount !== undefined &&
                                                            <div className="text-sm text-gray-50 bg-red-500 w-5 h-5 rounded-full flex items-center justify-center mt-2">
                                                                {item.unreadCount}
                                                            </div>
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else {
                                // 私聊渲染
                                let displayMessage = item.lastMessageContent || item.lastMeg;

                                // 根据消息类型显示不同的文本
                                if (item.lastMessageType === 2) {
                                    displayMessage = '[图片]';
                                } else if (item.lastMessageType === 3) {
                                    displayMessage = '[语音]';
                                } else if (item.lastMessageType === 4) {
                                    displayMessage = '[文件]';
                                }

                                const displayTime = item.lastMessageTime
                                    ? new Date(item.lastMessageTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                                    : item.lastMegTime;

                                return (
                                    <div key={`contact-${item.id}`}>
                                        <div className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0"
                                            onClick={() => {
                                                setChatWith({ name: item.name, id: item.user_id, avatar: item.avatar });
                                                setActiveMenu('聊天详情');
                                                setFrom('聊天');

                                                // 点击进入聊天时，立即清零未读数（UI优化）
                                                setContacts(prev => prev.map(c =>
                                                    c.user_id === item.user_id ? { ...c, count: 0 } : c
                                                ));
                                            }
                                            }>
                                            {/* 头像 + 在线状态 */}
                                            <div className="relative shrink-0 ml-3">
                                                <img
                                                    src={getAvatarUrl(item.avatar)}
                                                    alt={item.name}
                                                    width={48}
                                                    height={48}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                                {item.status === 'online' && (
                                                    <span className="absolute -bottom-1 left-9.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                                                )}
                                            </div>

                                            {/* 右侧信息 */}
                                            <div className='flex flex-1 min-w-0 justify-between gap-2 -ml-1'>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-gray-700 font-semibold truncate">{item.name}</p>
                                                    <p className="text-sm text-gray-300 truncate">
                                                        {displayMessage}
                                                    </p>
                                                </div>

                                                <div className={`shrink-0 mr-3 text-sm flex flex-col items-end ${item.count ? 'text-gray-700 font-bold' : 'text-gray-300'}`}>
                                                    {displayTime}
                                                    {item.count !== 0 && item.count !== null &&
                                                        <div className="text-sm text-gray-50 bg-red-500 w-5 h-5 rounded-full flex items-center justify-center mt-2">{item.count}</div>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            }
        </div>
    )
}