'use client';
import { useState, useEffect } from 'react';
import { getContacts, Contact } from '@/utils/api/contact';

type Props = {
    activeMenu: string;
    setActiveMenu: (m: '联系人' | '聊天详情') => void;
    setChatWith: (chat: { name: string; id: number; avatar: string | null }) => void;
    setFrom: (from: '联系人' | '聊天' | '用户') => void;
};

export default function Contacts({ activeMenu, setActiveMenu, setChatWith, setFrom }: Props) {
    //获取设置联系人数组
    const [contacts, setContacts] = useState<Contact[]>([]);
    //加载联系人的过渡动画
    const [loading, setLoading] = useState(false);
    //搜索的关键词和设置关键词
    const [keyword, setKeyword] = useState('');

    // 获取联系人列表
    useEffect(() => {
        const fetchContacts = async () => {
            const token = localStorage.getItem("token");
            if (!token) return;

            setLoading(true);
            try {
                const data = await getContacts(token);
                setContacts(data);
            } catch (error) {
                console.error("获取联系人失败:", error);
            } finally {
                setLoading(false);
            }
        };

        if (activeMenu === '联系人') {
            fetchContacts();
        }
    }, [activeMenu]);

    // 筛选数据
    const data = contacts.filter((item) =>
        item.name.toLowerCase().includes(keyword.trim().toLowerCase())
    );

    return (
        <div className="relative">

            {activeMenu === '联系人' &&
                <div className="">
                    {/* 搜索栏 */}
                    <div className="relative px-5">
                        <svg
                            className="w-5 h-5 absolute left-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M15.1916,16.607599C15.1916,16.607599,9.4766302,10.8916,9.4766302,10.8916C6.9343004,12.6991,3.4310703,12.256999,1.4175003,9.8745594C-0.59606278,7.4921393,-0.44821176,3.9642193,1.7576302,1.7586293C3.9628901,-0.44792366,7.4911504,-0.59641469,9.8740206,1.4170493C12.2569,3.4304993,12.699201,6.9340792,10.891601,9.4766293C10.891601,9.4766293,16.6066,15.192599,16.6066,15.192599C16.6066,15.192599,15.1926,16.6066,15.1926,16.6066C15.1926,16.6066,15.1916,16.607599,15.1916,16.607599C15.1916,16.607599,15.1916,16.607599,15.1916,16.607599ZM5.9996305,2.0006194C4.1033301,2.0001893,2.4673202,3.3313093,2.0821002,5.1880693C1.6968902,7.0448194,2.6683402,8.9168997,4.4083104,9.6708689C6.1482701,10.424799,8.1785307,9.8534594,9.2698698,8.3026791C10.3612,6.7518992,10.2137,4.6479492,8.9166298,3.2646294C8.9166298,3.2646294,9.5216303,3.8646293,9.5216303,3.8646293C9.5216303,3.8646293,8.8396301,3.1846294,8.8396301,3.1846294C8.8396301,3.1846294,8.82763,3.1726294,8.82763,3.1726294C8.0794201,2.4198093,7.0610204,1.9977593,5.9996305,2.0006194C5.9996305,2.0006194,5.9996305,2.0006194,5.9996305,2.0006194Z"
                                fill="#ADB5BD"
                            />
                        </svg>
                        <input 
                            className="w-full border-gray-200 text-sm py-2 rounded-md pl-9 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-50"
                            placeholder="Search" 
                            value={keyword} 
                            onChange={(e) => setKeyword(e.target.value)} 
                        />
                    </div>

                    {/* 联系人信息 */}
                    <div
                        className="flex flex-col mt-4 space-y-4 w-full overflow-y-auto scrollbar-hide max-h-[calc(100vh-211px)]"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}
                    >
                        {loading ? (
                            <p className="text-sm text-gray-400 text-center">加载中...</p>
                        ) : data.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center">
                                {keyword ? '无匹配结果' : '暂无联系人'}
                            </p>
                        ) : (
                            data.map((item) => (
                                <div key={item.id} className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 px-3"
                                    onClick={() => {
                                        //点击进入详细聊天
                                        setChatWith({ name: item.name, id: item.user_id, avatar:item.avatar });
                                        setActiveMenu('聊天详情');
                                        setFrom('联系人');
                                    }}>
                                    {/* 头像 + 在线状态 */}
                                    <div className="relative shrink-0">
                                        <img
                                            src={item.avatar || "/avatar/Profile.png"}
                                            alt={item.name}
                                            className="w-12 h-12 rounded-lg object-cover"
                                        />
                                        {item.status === 'online' && (
                                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                                        )}
                                    </div>

                                    {/* 右侧信息 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-700 font-semibold truncate">{item.name}</p>
                                        {item.status === 'online' ? (
                                            <p className="text-sm text-green-500">在线</p>
                                        ) : item.lastSeen ? (
                                            <p className="text-sm text-gray-400">
                                                最后登录 {new Date(item.lastSeen).toLocaleString('zh-CN', {
                                                    month: 'numeric',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-400">离线</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            }
        </div>
    )
}