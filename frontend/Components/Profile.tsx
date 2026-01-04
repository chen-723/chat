'use client';
import { useState, useEffect, useRef } from 'react';
import { getMe, uploadBio, uploadUsername } from "@/utils/api/auth";
import { getContacts, Contact } from '@/utils/api/contact';
import { Alert } from 'antd';
import { getGroups, Groups } from '@/utils/api/group'
import InitialsAvatar from './InitialsAvatar';

type Props = {
    activeMenu: string;
    setActiveMenu: (m: '聊天' | '聊天详情' | '群聊天详情') => void;
    setChatWith: (chat: { name: string; id: number; avatar: string | null }) => void;
    setFrom: (from: '联系人' | '聊天' | '用户') => void;
    avatarUpdateTrigger?: number;
    editType?: 'avatar' | 'username' | 'bio' | 'id' | null;
    onEditComplete?: () => void;
};


export default function Profile({ activeMenu, setActiveMenu, setChatWith, setFrom, avatarUpdateTrigger, editType, onEditComplete }: Props) {

    //设置个性签名的
    const bioInputRef = useRef<HTMLInputElement>(null);
    const [bioValue, setBioValue] = useState<string>('');
    //设置用户名的
    const usernameInputRef = useRef<HTMLInputElement>(null);
    const [usernameValue, setUsernameValue] = useState<string>('');

    //获取设置联系人数组
    const [contacts, setContacts] = useState<Contact[]>([]);
    //获取群聊数组
    const [groups, setGroups] = useState<Groups[]>([]);
    //警告弹窗
    const [alertVisible, setAlertVisible] = useState(false);
    // 获取联系人,群聊列表
    useEffect(() => {
        const fetchContacts = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            try {
                const data = await getContacts(token);
                const groupsdata = await getGroups(token);
                setContacts(data);
                setGroups(groupsdata);
            } catch (error) {
                console.error("获取联系人失败:", error);
            } finally {
            }
        };

        if (activeMenu === '用户') {
            fetchContacts();
        }
    }, [activeMenu]);

    //选择聊天或组
    const [ProfileChoose, setProfileChoose] = useState<string>("好友");

    //获取全部用户信息
    const [user, setUser] = useState({} as any);

    const fetchUserData = () => {
        const token = localStorage.getItem("token");
        if (!token) return;
        getMe(token)
            .then(res => setUser(res))
            .catch(() => { });
    };

    useEffect(() => {
        fetchUserData();
    }, [avatarUpdateTrigger]);

    // 当进入编辑模式时，设置初始值并聚焦，用户名和个性签名都在这
    useEffect(() => {
        if (editType === 'bio') {
            setBioValue(user.bio ?? '');
            setTimeout(() => bioInputRef.current?.focus(), 100);
        } else if (editType === 'username') {
            setUsernameValue(user.username ?? '');
            setTimeout(() => usernameInputRef.current?.focus(), 100);
        } else if (editType === 'id') {
            alert("你的id是" + user.id)
        }
    }, [editType, user.bio, user.username]);

    const handleSave = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            if (editType === 'bio') {
                await uploadBio(token, bioValue);
                setUser((prev: any) => ({ ...prev, bio: bioValue }));
            } else if (editType === 'username') {
                await uploadUsername(token, usernameValue);
                setUser((prev: any) => ({ ...prev, username: usernameValue }));
            }
            onEditComplete?.();
            setAlertVisible(true);
            setTimeout(() => setAlertVisible(false), 3000);
        } catch (error) {
            console.error('保存失败:', error);
            alert(error instanceof Error ? error.message : '保存失败');
        }
    };

    return (
        <div>
            {activeMenu === '用户' &&
                <div>
                    <div className='flex justify-center mt-5'>
                        <div className="relative inline-block">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={""}
                                    className="w-[100px] h-[100px] rounded-lg object-cover"
                                />
                            ) : (
                                <InitialsAvatar name={user.username || "User"} size={100} className="rounded-lg" />
                            )}
                            <span className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-green-500 border-2 border-white rounded-full z-10" />
                        </div>
                    </div>
                    {editType === 'username' ? (
                        //编辑用户名
                        <div className="flex justify-center mt-2 px-4">
                            <input
                                ref={usernameInputRef}
                                type="text"
                                value={usernameValue}
                                onChange={(e) => setUsernameValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSave();
                                    } else if (e.key === 'Escape') {
                                        setUsernameValue(user.username || '');
                                        onEditComplete?.();
                                    }
                                }}
                                maxLength={16}
                                className="w-80 text-center px-3 py-1 text-xl font-bold text-gray-700 border-b-2 border-blue-300 focus:outline-none bg-gray-50"
                            />
                        </div>
                    ) : (
                        <div className='flex justify-center mt-6 font-bold text-xl'>
                            {user.username || "Victoria Robertson"}
                        </div>
                    )}

                    {editType === 'bio' ? (
                        /* 编辑个性签名 */
                        <div className="flex justify-center mt-2 px-4">
                            <input
                                ref={bioInputRef}
                                type="text"
                                value={bioValue}
                                onChange={(e) => setBioValue(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSave();
                                    } else if (e.key === 'Escape') {
                                        setBioValue(user.bio || '');
                                        onEditComplete?.();
                                    }
                                }}
                                maxLength={255}
                                className="w-80 text-center px-3 py-1 text-sm font-semibold text-gray-700 border-b-2 border-blue-300 focus:outline-none bg-gray-50"
                            />
                        </div>
                    ) : (
                        <div className="flex justify-center mt-2 font-semibold text-sm text-gray-400">
                            {user.bio || 'A mantra goes here'}
                        </div>
                    )}

                    <div className='flex justify-center mt-2 font-semibold text-blue-500'>
                        {user.phone || '+91 9999 00000'}
                    </div>
                    <div className='flex justify-center px-4'>
                        <div className="flex gap-1 justify-self-center mt-6 bg-gray-200 p-0.5 w-full max-w-sm rounded-xl">
                            <div
                                className={`flex-1 flex justify-center items-center text-lg py-2 rounded-xl cursor-pointer
                                      ${ProfileChoose === '好友'
                                        ? 'text-blue-500 bg-white'
                                        : 'text-gray-400 hover:text-blue-500'}`}
                                onClick={() => setProfileChoose('好友')}
                            >
                                好友
                            </div>
                            <div
                                className={`flex-1 flex justify-center items-center text-lg py-2 rounded-xl cursor-pointer
                                     ${ProfileChoose === '群聊'
                                        ? 'text-blue-500 bg-white'
                                        : 'text-gray-400 hover:text-blue-500'}`}
                                onClick={() => setProfileChoose('群聊')}
                            >
                                群聊
                            </div>
                        </div>
                    </div>
                    {ProfileChoose === "好友" ?
                        (
                            <div
                                className="flex flex-col mt-4 space-y-4 w-full overflow-y-auto scrollbar-hide max-h-[calc(100vh-479px)]"
                                style={{
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                }}>
                                {contacts.map((item) => (
                                    <div key={item.id} className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0 px-3"
                                        onClick={() => {
                                            setChatWith({ name: item.name, id: item.user_id, avatar: item.avatar });
                                            setActiveMenu('聊天详情');
                                            setFrom('用户');
                                        }
                                        }>
                                        {/* 头像 + */}
                                        <div className="relative shrink-0">
                                            {item.avatar ? (
                                                <img
                                                    src={item.avatar}
                                                    alt={item.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <InitialsAvatar name={item.name} size={48} className="rounded-lg" />
                                            )}
                                            {item.status === 'online' && (
                                                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                                            )}
                                        </div>

                                        {/* 右侧信息 */}
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline gap-2">
                                                <p className="text-gray-700 font-semibold truncate mt-1 flex-1">{item.name}</p>
                                                <p className="text-sm font-medium text-gray-700 shrink-0">{item.lastMegTime}</p>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2 overflow-hidden">
                                                {item.bio}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="flex flex-col mt-4 space-y-4 w-full overflow-y-auto scrollbar-hide max-h-[calc(100vh-479px)]"
                                style={{
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                }}>
                                {groups.map((item) => (
                                    <div key={item.id} className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0 px-3"
                                        onClick={() => {
                                            setChatWith({ name: item.name, id: item.id, avatar: item.avatar });
                                            setActiveMenu('群聊天详情');
                                            setFrom('用户');
                                        }
                                        }>
                                        {/* 头像 + */}
                                        <div className="relative shrink-0">
                                            {item.avatar ? (
                                                <img
                                                    src={item.avatar}
                                                    alt={item.name}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <InitialsAvatar name={item.name} size={48} className="rounded-lg" />
                                            )}
                                        </div>

                                        {/* 右侧信息 */}
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline gap-2">
                                                <p className="text-gray-700 font-semibold truncate mt-1 flex-1">{item.name}</p>
                                                <p className="text-sm font-medium text-gray-700 shrink-0 mr-2">总人数：{item.member_count}</p>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2 overflow-hidden">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>
            }
            {alertVisible && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <Alert message={`设置成功`} type={"success"} className="shadow-lg" />
                </div>
            )}
        </div>
    )
}