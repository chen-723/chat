//顶栏

import { useState, useEffect, useRef } from 'react';
import { uploadAvatar, logoutUser } from '@/utils/api/auth';
import { changeGroups, deleteGroups } from '@/utils/api/group'
import { uploadFile } from '@/utils/api/messages'
import Alert from 'antd/es/alert/Alert';
import CreatGroup from './CreatGroup';
import Modal from 'antd/es/modal/Modal';
import AddFriend from './AddFriend';
import SERVER_CONFIG from '@/config/server';

type Props = {
    activeMenu: string,
    chatWith: { name: string; id: number; avatar: string | null } | null,
    setActiveMenu: (menu: string, from?: string) => void,
    setChatWith?: (contact: { name: string; id: number; avatar: string | null } | null, savePrevious?: boolean) => void,
    from?: string,
    onAvatarUpdate?: () => void,
    onGroupsUpdate?: () => void
    //把编辑模式传给父组件
    onEditProfile?: (editType: 'avatar' | 'username' | 'bio' | 'id') => void
    onEditGroup?: (editType: 'name' | 'description') => void
    groupAvatarUpdateTrigger?: number
}

export default function Top({ activeMenu, chatWith, setActiveMenu, setChatWith, from, onAvatarUpdate, onEditProfile, onGroupsUpdate, onEditGroup }: Props) {

    const [editMenu, setEditMenu] = useState<boolean>(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const groupAvatarInputRef = useRef<HTMLInputElement>(null);
    const [creatGroupsflog, setCreatGroupsFlog] = useState<boolean>(false);
    const [alertVisible, setAlertVisible] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [addFriend, setAddFriend] = useState(false);

    //退出群聊的确认函数
    const handleOk = () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                deleteGroups(token, chatWith!.id);
                setActiveMenu("聊天")
                setAlertVisible(true);
                setTimeout(() => setAlertVisible(false), 3000);
            }
        } catch (error) {
            console.error('删除失败:', error);
        }
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    //点击随意地点关掉下拉栏
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setEditMenu(false);
            }
        };
        // 元素监听器
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    //上传用户头像
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            alert('只能上传 JPG 或 PNG 格式的图片');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('请先登录');
                return;
            }
            await uploadAvatar(token, file);
            alert('头像上传成功！');
            onAvatarUpdate?.(); // 通知父组件更新
        } catch (error) {
            console.error('上传错误:', error);
            alert(error instanceof Error ? error.message : '上传出错');
        }
    };

    //上传群头像
    const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            alert('只能上传 JPG 或 PNG 格式的图片');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token || !chatWith) {
                alert('请先登录');
                return;
            }
            
            // 使用专门的群头像上传接口（保存到 avatars 目录）
            const formData = new FormData();
            formData.append('avatar', file);
            
            const res = await fetch(`${SERVER_CONFIG.API_BASE_URL}/api/groups/${chatWith.id}/avatar`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            
            if (!res.ok) throw new Error('上传失败');
            
            setAlertVisible(true);
            setTimeout(() => setAlertVisible(false), 3000);
            onGroupsUpdate?.(); // 通知父组件更新群信息
        } catch (error) {
            console.error('上传错误:', error);
            alert(error instanceof Error ? error.message : '上传出错');
        }
    };

    return (
        <div className="p-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
            />
            <input
                ref={groupAvatarInputRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={handleGroupAvatarUpload}
            />
            {activeMenu === '联系人' &&
                <div className='grid grid-cols-2 items-center gap-75'>
                    <div className='test-xl font-bold whitespace-nowrap'>
                        联系人
                    </div>
                    <svg
                        className={`w-5 h-5 flex justify-center items-center mx-auto`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 20"
                    // onClick={() => setEditMenu(v => !v)}
                    >
                        <path
                            // d="M8,8C8,8,8,14,8,14C8,14,6,14,6,14C6,14,6,8,6,8C6,8,0,8,0,8C0,8,0,6,0,6C0,6,6,6,6,6C6,6,6,0,6,0C6,0,8,0,8,0C8,0,8,6,8,6C8,6,14,6,14,6C14,6,14,8,14,8C14,8,8,8,8,8C8,8,8,8,8,8Z"
                            fill="#000000"
                        />
                    </svg>
                </div>}

            {activeMenu === '聊天' &&
                <div className='grid grid-cols-2 items-center gap-52'>
                    <div className='test-xl font-bold whitespace-nowrap'>
                        聊天
                    </div>
                    <div className='grid grid-cols-2 gap-2'>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                            onClick={async () => {
                                console.log("点击了发起群聊");
                                setCreatGroupsFlog(true);
                            }}>
                            <path
                                d="M14,8L16,8L16,5L19,5L19,3L16,3L16,0L14,0L14,3L11,3L11,5L14,5L14,8ZM16,10L18,10L18,13C18,14.1046,17.104601,15,16,15L6,15C5.5671301,14.9992,5.1458201,15.1396,4.8000002,15.4L0,19L0,3C0,1.89543,0.89543003,1,2,1L9,1L9,3L2,3L2,15L4.1339998,13.4C4.47964,13.1393,4.9010701,12.9988,5.3340001,13L16,13L16,10Z"
                                fill="#000000"
                            />
                        </svg>
                        <svg
                            className="w-5 h-5 cursor-pointer"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            onClick={() => setAddFriend(true)}
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v12M6 12h12" />
                        </svg>
                    </div>
                    {addFriend &&
                        <AddFriend
                            onClose={() => setAddFriend(false)}
                            setActiveMenu={setActiveMenu}
                            setChatWith={setChatWith}
                        />
                    }
                    {creatGroupsflog &&
                        <CreatGroup
                            onGroupsUpdate={onGroupsUpdate}
                            onClose={() => setCreatGroupsFlog(false)}
                        />
                    }
                </div>}

            {activeMenu === '用户' &&
                <div className='grid grid-cols-2 items-center gap-70'>
                    <div className='test-xl font-bold whitespace-nowrap'>
                        用户
                    </div>
                    <svg
                        className={`w-5 h-5 flex justify-center items-center mx-auto`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 20"
                        onClick={() => setEditMenu(v => !v)}
                    >
                        <path
                            d="M0,14.2525C0,14.2525,0,18.002501,0,18.002501C0,18.002501,3.75,18.002501,3.75,18.002501C3.75,18.002501,14.81,6.9425001,14.81,6.9425001C14.81,6.9425001,11.06,3.1925001,11.06,3.1925001C11.06,3.1925001,0,14.2525,0,14.2525C0,14.2525,0,14.2525,0,14.2525ZM17.709999,4.0425C18.1,3.6524999,18.1,3.0225,17.709999,2.6324999C17.709999,2.6324999,15.37,0.29249999,15.37,0.29249999C14.98,-0.097499996,14.35,-0.097499996,13.96,0.29249999C13.96,0.29249999,12.13,2.1224999,12.13,2.1224999C12.13,2.1224999,15.88,5.8724999,15.88,5.8724999C15.88,5.8724999,17.709999,4.0425,17.709999,4.0425C17.709999,4.0425,17.709999,4.0425,17.709999,4.0425C17.709999,4.0425,17.709999,4.0425,17.709999,4.0425Z"
                            fill="#000000"
                        />
                    </svg>
                    {editMenu && (
                        <div ref={menuRef} className="absolute top-12 right-1 z-50">
                            <div className='overflow-hidden rounded-lg border border-gray-200 shadow-lg bg-white'>
                                <div className="flex flex-col divide-y divide-gray-100">
                                    {([
                                        { label: '设置头像', action: 'avatar' as const },
                                        { label: '设置用户名', action: 'username' as const },
                                        { label: '设置个性签名', action: 'bio' as const },
                                    ] as const).map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex justify-end px-2.5 py-2 text-sm text-gray-700 cursor-pointer bg-white hover:bg-gray-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log('点击了菜单项:', item.action);

                                                // 通知父组件进入编辑模式
                                                onEditProfile?.(item.action);
                                                setEditMenu(false);

                                                // 特殊处理：头像直接触发文件选择
                                                if (item.action === 'avatar') {
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                        >
                                            <span>{item.label}</span>
                                        </div>
                                    ))}
                                    <div
                                        className="flex justify-end px-2.5 py-2 text-sm text-red-500 cursor-pointer bg-white hover:bg-red-50"
                                        onClick={async () => {
                                            try {
                                                const token = localStorage.getItem('token');
                                                if (token) {
                                                    //退出登录接口
                                                    await logoutUser(token);
                                                }
                                            } catch (error) {
                                                console.error('登出失败:', error);
                                            } finally {
                                                // 先关闭 WebSocket 连接
                                                const { wsClient } = await import('@/utils/websocket');
                                                wsClient.close();

                                                // 清除本地 token 并刷新
                                                localStorage.removeItem('token');
                                                window.location.reload();
                                            }
                                        }}>
                                        <span>退出登录</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>}

            {activeMenu === '搜索' &&
                <div className='grid grid-cols-2 items-center gap-70'>
                    <div className='test-xl font-bold whitespace-nowrap'>
                        搜索
                    </div>
                    {/* <EditOutlined /> */}

                </div>}
            {/* 私聊页面 */}
            {activeMenu === '聊天详情' && chatWith &&
                <div className='grid grid-cols-2 items-center gap-52'>
                    <div className='grid grid-cols-2 gap-1 items-center'>
                        <svg
                            onClick={() => setActiveMenu('聊天')}
                            className={`w-5 h-5 flex justify-center items-center mx-auto`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M0,6.0100002C0,6.0100002,6.0100002,12.02,6.0100002,12.02C6.0100002,12.02,7.4239998,10.606,7.4239998,10.606C7.4239998,10.606,2.8239999,6.006,2.8239999,6.006C2.8239999,6.006,7.4239998,1.406,7.4239998,1.406C7.4239998,1.406,6.0100002,0,6.0100002,0C6.0100002,0,0,6.0100002,0,6.0100002C0,6.0100002,0,6.0100002,0,6.0100002Z"
                                fill="#000000"
                            />
                        </svg>
                        <div className='test-xl font-bold mt-0.5 whitespace-nowrap'>
                            {chatWith.name}
                        </div>
                    </div>
                    <div className='grid grid-cols-2 gap-1 items-center'>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                // d="M15.1916,16.607599C15.1916,16.607599,9.4766302,10.8916,9.4766302,10.8916C6.9343004,12.6991,3.4310703,12.256999,1.4175003,9.8745594C-0.59606278,7.4921393,-0.44821176,3.9642193,1.7576302,1.7586293C3.9628901,-0.44792366,7.4911504,-0.59641469,9.8740206,1.4170493C12.2569,3.4304993,12.699201,6.9340792,10.891601,9.4766293C10.891601,9.4766293,16.6066,15.192599,16.6066,15.192599C16.6066,15.192599,15.1926,16.6066,15.1926,16.6066C15.1926,16.6066,15.1916,16.607599,15.1916,16.607599C15.1916,16.607599,15.1916,16.607599,15.1916,16.607599ZM5.9996305,2.0006194C4.1033301,2.0001893,2.4673202,3.3313093,2.0821002,5.1880693C1.6968902,7.0448194,2.6683402,8.9168997,4.4083104,9.6708689C6.1482701,10.424799,8.1785307,9.8534594,9.2698698,8.3026791C10.3612,6.7518992,10.2137,4.6479492,8.9166298,3.2646294C8.9166298,3.2646294,9.5216303,3.8646293,9.5216303,3.8646293C9.5216303,3.8646293,8.8396301,3.1846294,8.8396301,3.1846294C8.8396301,3.1846294,8.82763,3.1726294,8.82763,3.1726294C8.0794201,2.4198093,7.0610204,1.9977593,5.9996305,2.0006194C5.9996305,2.0006194,5.9996305,2.0006194,5.9996305,2.0006194Z"
                                fill="#000000"
                            />
                        </svg>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                            onClick={() => setActiveMenu("联系人详情", "聊天详情")}
                        >
                            <path
                                d="M2,4C3.0999999,4,4,3.0999999,4,2C4,0.89999998,3.0999999,0,2,0C0.89999998,0,0,0.89999998,0,2C0,3.0999999,0.89999998,4,2,4C2,4,2,4,2,4ZM2,6C0.89999998,6,0,6.9000001,0,8C0,9.1000004,0.89999998,10,2,10C3.0999999,10,4,9.1000004,4,8C4,6.9000001,3.0999999,6,2,6C2,6,2,6,2,6ZM2,12C0.89999998,12,0,12.9,0,14C0,15.1,0.89999998,16,2,16C3.0999999,16,4,15.1,4,14C4,12.9,3.0999999,12,2,12C2,12,2,12,2,12Z"
                                fill="#000000"
                            />
                        </svg>
                    </div>
                </div>
            }
            {/* 群的聊天页面 */}
            {activeMenu === '群聊天详情' && chatWith &&
                <div className='grid grid-cols-2 items-center gap-52'>
                    <div className='grid grid-cols-2 gap-1 items-center'>
                        <svg
                            onClick={() => {
                                {
                                    setActiveMenu('聊天');
                                }
                            }}
                            className={`w-5 h-5 flex justify-center items-center mx-auto`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M0,6.0100002C0,6.0100002,6.0100002,12.02,6.0100002,12.02C6.0100002,12.02,7.4239998,10.606,7.4239998,10.606C7.4239998,10.606,2.8239999,6.006,2.8239999,6.006C2.8239999,6.006,7.4239998,1.406,7.4239998,1.406C7.4239998,1.406,6.0100002,0,6.0100002,0C6.0100002,0,0,6.0100002,0,6.0100002C0,6.0100002,0,6.0100002,0,6.0100002Z"
                                fill="#000000"
                            />
                        </svg>
                        <div className='test-xl font-bold mt-0.5 whitespace-nowrap'>
                            {chatWith.name}
                        </div>
                    </div>
                    <div className='grid grid-cols-2 gap-1 items-center'>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M15.1916,16.607599C15.1916,16.607599,9.4766302,10.8916,9.4766302,10.8916C6.9343004,12.6991,3.4310703,12.256999,1.4175003,9.8745594C-0.59606278,7.4921393,-0.44821176,3.9642193,1.7576302,1.7586293C3.9628901,-0.44792366,7.4911504,-0.59641469,9.8740206,1.4170493C12.2569,3.4304993,12.699201,6.9340792,10.891601,9.4766293C10.891601,9.4766293,16.6066,15.192599,16.6066,15.192599C16.6066,15.192599,15.1926,16.6066,15.1926,16.6066C15.1926,16.6066,15.1916,16.607599,15.1916,16.607599C15.1916,16.607599,15.1916,16.607599,15.1916,16.607599ZM5.9996305,2.0006194C4.1033301,2.0001893,2.4673202,3.3313093,2.0821002,5.1880693C1.6968902,7.0448194,2.6683402,8.9168997,4.4083104,9.6708689C6.1482701,10.424799,8.1785307,9.8534594,9.2698698,8.3026791C10.3612,6.7518992,10.2137,4.6479492,8.9166298,3.2646294C8.9166298,3.2646294,9.5216303,3.8646293,9.5216303,3.8646293C9.5216303,3.8646293,8.8396301,3.1846294,8.8396301,3.1846294C8.8396301,3.1846294,8.82763,3.1726294,8.82763,3.1726294C8.0794201,2.4198093,7.0610204,1.9977593,5.9996305,2.0006194C5.9996305,2.0006194,5.9996305,2.0006194,5.9996305,2.0006194Z"
                                fill="#000000"
                            />
                        </svg>
                        <svg
                            className={`w-5 h-5 flex justify-center items-center mx-auto`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                            onClick={() => setActiveMenu('群资料', '群聊天详情')}
                        >
                            <path
                                d="M2,4C3.0999999,4,4,3.0999999,4,2C4,0.89999998,3.0999999,0,2,0C0.89999998,0,0,0.89999998,0,2C0,3.0999999,0.89999998,4,2,4C2,4,2,4,2,4ZM2,6C0.89999998,6,0,6.9000001,0,8C0,9.1000004,0.89999998,10,2,10C3.0999999,10,4,9.1000004,4,8C4,6.9000001,3.0999999,6,2,6C2,6,2,6,2,6ZM2,12C0.89999998,12,0,12.9,0,14C0,15.1,0.89999998,16,2,16C3.0999999,16,4,15.1,4,14C4,12.9,3.0999999,12,2,12C2,12,2,12,2,12Z"
                                fill="#000000"
                            />
                        </svg>
                    </div>
                </div>
            }
            {/* 联系人资料 */}
            {activeMenu === '联系人详情' && chatWith &&
                <div className='grid grid-cols-2 items-center gap-52'>
                    <div className='grid grid-cols-2 gap-1'>
                        <svg
                            onClick={() => {
                                if (from) {
                                    setActiveMenu(from);
                                } else {
                                    setActiveMenu('聊天详情');
                                }
                            }}
                            className={`w-5 h-5 flex justify-center items-center mx-auto mt-2 cursor-pointer`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M0,6.0100002C0,6.0100002,6.0100002,12.02,6.0100002,12.02C6.0100002,12.02,7.4239998,10.606,7.4239998,10.606C7.4239998,10.606,2.8239999,6.006,2.8239999,6.006C2.8239999,6.006,7.4239998,1.406,7.4239998,1.406C7.4239998,1.406,6.0100002,0,6.0100002,0C6.0100002,0,0,6.0100002,0,6.0100002C0,6.0100002,0,6.0100002,0,6.0100002Z"
                                fill="#000000"
                            />
                        </svg>
                        <div className='test-xl font-bold mt-0.5 whitespace-nowrap'>
                            {chatWith.name}
                        </div>
                    </div>
                </div>
            }
            {activeMenu === '群资料' && chatWith &&
                <div className='grid grid-cols-2 items-center gap-52'>
                    <div className='grid grid-cols-2 gap-1'>
                        <svg
                            onClick={() => {
                                    setActiveMenu('群聊天详情');
                            }}
                            className={`w-5 h-5 flex justify-center items-center mx-auto mt-2 cursor-pointer`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 20"
                        >
                            <path
                                d="M0,6.0100002C0,6.0100002,6.0100002,12.02,6.0100002,12.02C6.0100002,12.02,7.4239998,10.606,7.4239998,10.606C7.4239998,10.606,2.8239999,6.006,2.8239999,6.006C2.8239999,6.006,7.4239998,1.406,7.4239998,1.406C7.4239998,1.406,6.0100002,0,6.0100002,0C6.0100002,0,0,6.0100002,0,6.0100002C0,6.0100002,0,6.0100002,0,6.0100002Z"
                                fill="#000000"
                            />
                        </svg>
                        <div className='test-xl font-bold mt-0.5 whitespace-nowrap'>
                            {chatWith.name}
                        </div>
                    </div>
                    <svg
                        className={`w-5 h-5 flex justify-center items-center mx-auto`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 20"
                        onClick={() => setEditMenu(v => !v)}
                    >
                        <path
                            d="M0,14.2525C0,14.2525,0,18.002501,0,18.002501C0,18.002501,3.75,18.002501,3.75,18.002501C3.75,18.002501,14.81,6.9425001,14.81,6.9425001C14.81,6.9425001,11.06,3.1925001,11.06,3.1925001C11.06,3.1925001,0,14.2525,0,14.2525C0,14.2525,0,14.2525,0,14.2525ZM17.709999,4.0425C18.1,3.6524999,18.1,3.0225,17.709999,2.6324999C17.709999,2.6324999,15.37,0.29249999,15.37,0.29249999C14.98,-0.097499996,14.35,-0.097499996,13.96,0.29249999C13.96,0.29249999,12.13,2.1224999,12.13,2.1224999C12.13,2.1224999,15.88,5.8724999,15.88,5.8724999C15.88,5.8724999,17.709999,4.0425,17.709999,4.0425C17.709999,4.0425,17.709999,4.0425,17.709999,4.0425C17.709999,4.0425,17.709999,4.0425,17.709999,4.0425Z"
                            fill="#000000"
                        />
                    </svg>
                    {editMenu && (
                        <div ref={menuRef} className="absolute top-12 right-1 z-50">
                            <div className='overflow-hidden rounded-lg border border-gray-200 shadow-lg bg-white'>
                                <div className="flex flex-col divide-y divide-gray-100">
                                    {([
                                        { label: '设置群头像', action: 'avatar' as const },
                                        { label: '设置群名', action: 'name' as const },
                                        { label: '设置群简介', action: 'description' as const },
                                    ] as const).map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex justify-end px-2.5 py-2 text-sm text-gray-700 cursor-pointer bg-white hover:bg-gray-50"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log('点击了菜单项:', item.action);

                                                // 特殊处理：群头像直接触发文件选择
                                                if (item.action === 'avatar') {
                                                    groupAvatarInputRef.current?.click();
                                                } else {
                                                    onEditGroup?.(item.action);
                                                }
                                                setEditMenu(false);
                                            }}
                                        >
                                            <span>{item.label}</span>
                                        </div>
                                    ))}
                                    <div
                                        className="flex justify-end px-2.5 py-2 text-sm text-red-500 cursor-pointer bg-white hover:bg-red-50"
                                        onClick={() => {
                                            setIsModalOpen(true);
                                        }}>
                                        <span>解散群聊</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
            {alertVisible && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <Alert message="设置成功" type="success" className="shadow-lg" />
                </div>
            )}
            {isModalOpen === true &&
                <Modal
                    title="解散群聊"
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    open={isModalOpen}
                    onOk={handleOk}
                    onCancel={handleCancel}
                >
                    <p>确认要解散该群聊吗？</p>
                </Modal>}
        </div>
    )
}   