
//搜索页现在还是添加好友，后面要改成查找联系人，群聊，聊天记录的

import { searchUsers, UserResponse, getMe } from "@/utils/api/auth";
import { Groups, searchGroups } from "@/utils/api/group";
import { MessageSearchResult, searchMessages } from '@/utils/api/messages'
import SearchOutlined from "@ant-design/icons/lib/icons/SearchOutlined";
import { useState, useEffect } from "react";
import SERVER_CONFIG from '@/config/server';

type Props = {
    activeMenu: string;
    setActiveMenu: (menu: string, from?: string) => void,
    setChatWith?: (contact: { name: string; id: number; avatar: string | null } | null, savePrevious?: boolean) => void;
};

export default function Search({ activeMenu, setActiveMenu, setChatWith }: Props) {
    //搜索框
    const [kw, setKw] = useState("");
    //搜索用户的
    const [friendResults, setFriendResults] = useState<UserResponse[]>([]);
    //加载中
    const [loading, setLoading] = useState(false);

    const [user, setUser] = useState<any>(null);
    //搜索群
    const [groupResults, setGroupResults] = useState<Groups[]>([]);
    //搜索聊天记录
    const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([]);


    const token = localStorage.getItem("token");
    if (!token) {
        alert("请先登录");
        return;
    }

    // 获取当前用户信息
    useEffect(() => {
        getMe(token).then(setUser).catch(console.error);
    }, [token]);

    // 搜索
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.trim();
        setKw(v);

        // 如果搜索框为空，清空所有结果
        if (!v) {
            setFriendResults([]);
            setGroupResults([]);
            setMessageResults([]);
            return;
        }

        setLoading(true);

        // 并发调用三个搜索接口
        Promise.all([
            searchUsers(token, v).catch(() => []),
            searchGroups(token, v).catch(() => []),
            searchMessages(token, v).catch(() => [])
        ])
            .then(([users, groups, messages]) => {
                // 过滤掉当前用户
                const filteredUsers = users.filter(u => user && u.id !== user.id);
                setFriendResults(filteredUsers);
                setGroupResults(groups);
                setMessageResults(messages);
            })
            .catch((err) => {
                console.error('搜索失败:', err);
                setFriendResults([]);
                setGroupResults([]);
                setMessageResults([]);
            })
            .finally(() => setLoading(false));
    };

    // 点击用户
    const onUserClick = (clickedUser: UserResponse) => {
        // 如果点击的是自己，跳转到用户页面
        if (user && clickedUser.id === user.id) {
            setActiveMenu('用户');
            return;
        }

        // 跳转到联系人详情页
        setChatWith?.({
            name: clickedUser.username,
            id: clickedUser.id,
            avatar: clickedUser.avatar
        });
        setActiveMenu('联系人详情', '搜索');
    };

    // 点击群聊
    const onGroupClick = (clickedUser: Groups) => {
        // 跳转到群资料页
        setChatWith?.({
            name: clickedUser.name,
            id: clickedUser.id,
            avatar: clickedUser.avatar
        });
        setActiveMenu('群资料', '搜索');
    };

    // 点击聊天记录
    const onMessageSearchResultClick = (clickedUser: MessageSearchResult) => {
        //判断是私聊还是群聊
        if (clickedUser.chat_type === "private") {
            // 跳转到联系人资料页
            if (!setChatWith) return;
            setChatWith({
                name: clickedUser.chat_info.peer_username ?? 'Unknown',
                id: clickedUser.chat_info.peer_user_id ?? -1,
                avatar: clickedUser.chat_info.peer_avatar ?? null,
            });
            setActiveMenu('联系人详情', '搜索');
        }
        else if (clickedUser.chat_type === "group") {
            // 跳转到群资料页
            if (!setChatWith) return;
            setChatWith({
                name: clickedUser.chat_info.group_name ?? 'Unknown',
                id: clickedUser.chat_info.group_id ?? -1,
                avatar: clickedUser.chat_info.group_avatar ?? null,
            });
            setActiveMenu('群聊天详情', '搜索');
        }
    };

    // 处理头像 URL
    const getAvatarUrl = (avatar: string | null | undefined) => {
        if (!avatar) return '/avatar/Profile.png';
        return avatar.startsWith('http') ? avatar : `${SERVER_CONFIG.API_BASE_URL}${avatar}`;
    };

    if (activeMenu !== "搜索") return null;

    // 聊天记录按会话分组（同一个群/用户只显示一次，显示最新的一条）
    const groupedMessages = messageResults.reduce((acc, msg) => {
        // 只保留文本消息
        if (msg.msg_type !== 1) return acc;

        const key = msg.chat_type === "private"
            ? `private_${msg.chat_info.peer_user_id}`
            : `group_${msg.chat_info.group_id}`;

        // 如果还没有这个会话，初始化
        if (!acc[key]) {
            acc[key] = {
                message: msg,
                count: 1
            };
        } else {
            // 增加计数
            acc[key].count += 1;
            // 如果当前消息更新，更新显示的消息
            if (new Date(msg.created_at) > new Date(acc[key].message.created_at)) {
                acc[key].message = msg;
            }
        }
        return acc;
    }, {} as Record<string, { message: MessageSearchResult; count: number }>);

    const uniqueMessages = Object.values(groupedMessages);

    return (
        <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 58px)' }}>
            {/* 输入框 - 固定在顶部 */}
            <div className="px-4 pt-4 pb-4 bg-white shrink-0 border-b border-gray-200">
                <div className="relative w-full">
                    <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                    <input
                        className="w-full border-gray-200 border-2 text-sm py-3 rounded-md pl-10 pr-4 ring-gray-200 focus:ring-1 focus:outline-none"
                        placeholder="搜索用户、群聊、聊天记录"
                        type="text"
                        value={kw}
                        onChange={onChange}
                    />
                </div>
            </div>

            {/* 搜索结果 - 可滚动区域 */}
            <div
                className="flex-1 overflow-y-auto scrollbar-hide max-h-[calc(100vh-239px)]"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}>
                {/* 用户搜索结果 */}
                {friendResults.length > 0 && (
                    <div className="mt-2">
                        <div className="text-xs text-gray-400 px-4 py-2 font-semibold">
                            用户 ({friendResults.length})
                        </div>
                        {friendResults.map((u) => (
                            <div
                                key={u.id}
                                className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0 hover:bg-gray-50 cursor-pointer"
                                onClick={() => onUserClick(u)}>
                                <div className="relative shrink-0 ml-3">
                                    <img
                                        src={getAvatarUrl(u.avatar)}
                                        className="w-12 h-12 rounded-lg object-cover"
                                        alt=""
                                    />
                                </div>
                                <div className="flex flex-1 min-w-0 justify-between gap-2 mr-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-gray-700 font-semibold truncate">{u.username}</p>
                                        <p className="text-sm text-gray-300 truncate">
                                            {u.bio || 'A mantra goes here'}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-sm text-gray-500">
                                        用户id:{u.id}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 群聊搜索结果 */}
                {groupResults.length > 0 && (
                    <div className="mt-2">
                        <div className="text-xs text-gray-400 px-4 py-2 font-semibold">
                            群聊 ({groupResults.length})
                        </div>
                        {groupResults.map((u) => (
                            <div
                                key={u.id}
                                className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0 hover:bg-gray-50 cursor-pointer"
                                onClick={() => onGroupClick(u)}
                            >
                                <div className="relative shrink-0 ml-3">
                                    <img
                                        src={getAvatarUrl(u.avatar)}
                                        className="w-12 h-12 rounded-lg object-cover"
                                        alt=""
                                    />
                                </div>
                                <div className="flex flex-1 min-w-0 justify-between gap-2 mr-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-gray-700 font-semibold truncate">{u.name}</p>
                                        <p className="text-sm text-gray-300 truncate">
                                            {u.description || "暂无群简介"}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-sm text-gray-300">
                                        {u.member_count}人
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 聊天记录搜索结果 */}
                {uniqueMessages.length > 0 && (
                    <div className="mt-2">
                        <div className="text-xs text-gray-400 px-4 py-2 font-semibold">
                            聊天记录 ({uniqueMessages.length})
                        </div>
                        {uniqueMessages.map((item) => (
                            <div
                                key={`${item.message.chat_type}_${item.message.chat_type === "private" ? item.message.chat_info.peer_user_id : item.message.chat_info.group_id}`}
                                className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0 hover:bg-gray-50 cursor-pointer"
                                onClick={() => onMessageSearchResultClick(item.message)}
                            >
                                {/* 头像：私聊显示对方头像，群聊显示群头像 */}
                                <div className="relative shrink-0 ml-3">
                                    <img
                                        src={
                                            item.message.chat_type === "private"
                                                ? getAvatarUrl(item.message.chat_info.peer_avatar)
                                                : getAvatarUrl(item.message.chat_info.group_avatar)
                                        }
                                        className="w-12 h-12 rounded-lg object-cover"
                                        alt=""
                                    />
                                </div>

                                <div className="flex flex-1 min-w-0 justify-between gap-2 mr-3">
                                    <div className="min-w-0 flex-1">
                                        {/* 标题：私聊显示对方用户名，群聊显示群名 */}
                                        <p className="text-gray-700 font-semibold truncate">
                                            {item.message.chat_type === "private"
                                                ? item.message.chat_info.peer_username
                                                : item.message.chat_info.group_name}
                                        </p>
                                        {/* 消息内容预览 */}
                                        <p className="text-sm text-gray-300 truncate">
                                            {item.message.chat_type === "group" && (
                                                <span className="text-gray-400">{item.message.sender.username}: </span>
                                            )}
                                            {item.message.content}
                                            {item.count > 1 && (
                                                <span className="text-gray-400"> (共{item.count}条相关消息)</span>
                                            )}
                                        </p>
                                    </div>
                                    {/* 时间戳 */}
                                    <div className="shrink-0 text-sm text-gray-300">
                                        {new Date(item.message.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 无结果提示 */}
                {!loading && kw && friendResults.length === 0 && groupResults.length === 0 && uniqueMessages.length === 0 && (
                    <div className="text-center text-gray-400 mt-8">
                        未找到相关结果
                    </div>
                )}

                {/* 加载提示 */}
                {loading && (
                    <div className="text-center text-gray-400 mt-8">搜索中...</div>
                )}
            </div>
        </div>
    );
}