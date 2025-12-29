//群聊添加成员用的

import { searchUsers, UserResponse, getMe } from "@/utils/api/auth";
import { addGroupMembers } from "@/utils/api/group";
import SearchOutlined from '@ant-design/icons/lib/icons/SearchOutlined';
import Alert from 'antd/es/alert/Alert';
import { useState, useEffect } from "react";

type Props = {
    onClose: () => void;
    groupDetailId: number;
    onMemberAdded?: () => void;
}

export default function AddList({ onClose, groupDetailId, onMemberAdded }: Props) {

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [alertType, setAlertType] = useState<"success" | "error">("success");
    const [kw, setKw] = useState("");
    const [list, setList] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    const token = localStorage.getItem("token");
    if (!token) {
        alert("请先登录");
        return null;
    }

    // 获取当前用户信息
    useEffect(() => {
        getMe(token).then(user => setCurrentUserId(user.id)).catch(console.error);
    }, [token]);

    // 搜索
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.trim();
        setKw(v);
        if (!v) return setList([]);
        setLoading(true);
        searchUsers(token, v)
            .then(results => {
                // 过滤掉当前用户
                const filtered = results.filter(u => u.id !== currentUserId);
                setList(filtered);
            })
            .catch(() => setList([]))
            .finally(() => setLoading(false));
    };

    const showAlert = (message: string, type: "success" | "error") => {
        setAlertMessage(message);
        setAlertType(type);
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 3000);
    };

    const onAddGroupMembers = async (user: UserResponse) => {
        try {
            await addGroupMembers(token, groupDetailId, user.id);
            showAlert("添加成功", "success");
            onMemberAdded?.();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('添加失败:', error);

            // 根据错误信息显示不同提示
            const errorMsg = error.message || error.toString();

            if (errorMsg.includes("无权限")) {
                showAlert("无权限添加成员", "error");
            } else if (errorMsg.includes("已在群中") || errorMsg.includes("已存在")) {
                showAlert("该用户已在群中", "error");
            } else if (errorMsg.includes("不存在")) {
                showAlert("群组不存在", "error");
            } else if (errorMsg.includes("403")) {
                showAlert("无权限添加成员", "error");
            } else if (errorMsg.includes("400")) {
                showAlert("该用户已在群中", "error");
            } else if (errorMsg.includes("404")) {
                showAlert("群组不存在", "error");
            } else {
                showAlert(errorMsg || "添加失败，请重试", "error");
            }
        }
    };

    return (
        <div className='fixed inset-0 z-50 bg-white/30 backdrop-blur-xs flex items-center justify-center mb-20' onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md"
                onClick={(e) => e.stopPropagation()}>

                <h1 className='flex items-center justify-center'>搜索用户点击添加</h1>
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
                                onClick={() => onAddGroupMembers(u)}
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

            {/* 提示信息 */}
            {alertVisible && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <Alert message={alertMessage} type={alertType} className="shadow-lg" />
                </div>
            )}
        </div>
    )
}