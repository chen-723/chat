import { getMe, searchUsers, UserResponse } from "@/utils/api/auth";
import SearchOutlined from "@ant-design/icons/lib/icons/SearchOutlined";
import { useEffect, useState } from "react";


type Props = {
    onClose: () => void;
    setActiveMenu: (menu: string, from?: string) => void,
    setChatWith?: (contact: { name: string; id: number; avatar: string | null } | null, savePrevious?: boolean) => void;
}

export default function addFriend({ onClose, setActiveMenu, setChatWith }: Props) {


    const [kw, setKw] = useState("");
    const [list, setList] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    const token = localStorage.getItem("token");
    if (!token) {
        alert("请先登录");
        return null;
    }

    // 获取当前用户信息
    useEffect(() => {
        getMe(token).then(setUser).catch(console.error);
    }, [token]);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.trim();
        setKw(v);
        if (!v) return setList([]);
        setLoading(true);
        searchUsers(token, v)
            .then(results => {
                // 过滤掉当前用户
                const filtered = results.filter(u => user && u.id !== user.id);
                setList(filtered);
            })
            .catch(() => setList([]))
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
        setActiveMenu('联系人详情', '聊天');
    };

    return (
        <div className='fixed inset-0 z-50 bg-white/30 backdrop-blur-xs flex items-center justify-center mb-20' onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md"
                onClick={(e) => e.stopPropagation()}>

                <h1 className='flex items-center justify-center'>添加好友</h1>
                <div className="flex justify-center relative mt-4">
                    <SearchOutlined className="absolute left-4.5 top-6 -translate-y-1/2 z-10" />
                    <input
                        className="w-full border-gray-200 border-2 text-sm py-3 rounded-md pl-10 pr-4 ring-gray-200 focus:ring-1 focus:outline-none"
                        placeholder="输入用户名搜索"
                        type="text"
                        value={kw}
                        onChange={onChange}
                    />
                </div>
                {/* 下拉候选区 */}
                {list.length > 0 && (
                    <div className="bg-white rounded-md shadow-lg max-h-76 overflow-auto mt-2">
                        {list.map((u) => (
                            <div
                                key={u.id}
                                className="flex items-center p-3.5 hover:bg-gray-100 cursor-pointer border-t first:border-t-0 border-gray-200"
                                onClick={() => onUserClick(u)}
                            >
                                <img
                                    src={u.avatar || "/avatar/Profile.png"}
                                    className="w-12 h-12 rounded-full mr-3 object-cover shrink-0"
                                    alt=""
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold truncate">{u.username}</div>
                                    <div className="text-sm text-gray-500 truncate">
                                        {u.bio || '暂无简介'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 加载提示 */}
                {loading && (
                    <div className="text-sm text-gray-400 mt-4 text-center">搜索中...</div>
                )}

                {/* 无结果提示 */}
                {kw && !loading && list.length === 0 && (
                    <div className="text-sm text-gray-400 mt-4 text-center">未找到相关用户</div>
                )}

                <div className="mt-4 flex justify-center">
                    <button className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                        onClick={onClose}>
                        取消
                    </button>
                </div>
            </div>
        </div>
    )
}