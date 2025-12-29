//联系人详细资料页

import { getContactDetail, Contact, removeContact, toggleFavorite, addContact } from '@/utils/api/contact'
import StarOutlined from '@ant-design/icons/lib/icons/StarOutlined';
import Alert from 'antd/es/alert/Alert';
import Modal from 'antd/es/modal/Modal';
import { useEffect, useState } from 'react';
import Callpage from './Callpage'

type Props = {
    activeMenu: string;
    setActiveMenu: (menu: string, from?: string) => void,
    chatWith: { name: string; id: number; avatar: string | null } | null;
    from?: string;
};

export default function ContactDetail({ activeMenu, setActiveMenu, chatWith, from }: Props) {
    const [contactDetail, setContactDetail] = useState<Contact | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [is_favorite, setIsFavorite] = useState(contactDetail?.is_favorite ?? false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [isFriend, setIsFriend] = useState(true); // 是否为好友

    const [openCallPage, setOpenCallPage] = useState(false);

    const showModal = () => {
        setIsModalOpen(true);
    };
    const handleOk = () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                removeContact(token, chatWith!.id);
                setActiveMenu("聊天"); // 删除好友后返回聊天列表
                setAlertVisible(false);
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

    useEffect(() => {
        if (activeMenu !== '联系人详情' || !chatWith) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        (async () => {
            try {
                const data = await getContactDetail(token, chatWith.id);
                setContactDetail(data);          // 写状态
                setIsFavorite(data!.is_favorite); // 同步 favorite 状态
                setIsFriend(true);               // 是好友
                console.log('联系人详情:', data);
            } catch (err) {
                // console.error('获取联系人详情失败:', err);
                // 如果获取失败（比如不是好友），设置为非好友状态
                setIsFriend(false);
                // 仍然显示基本信息，但不显示操作按钮
                setContactDetail({
                    id: 0,
                    user_id: chatWith.id,
                    name: chatWith.name,
                    avatar: chatWith.avatar,
                    status: 'offline',
                    bio: null,
                    lastSeen: null,
                    lastMegTime: null,
                    lastMeg: null,
                    count: null,
                    is_favorite: false,
                } as Contact);
            }
        })();
    }, [activeMenu, chatWith]);

    if (activeMenu !== "联系人详情") return null;

    // 加载中状态
    if (!contactDetail) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-gray-400">加载中...</div>
            </div>
        );
    }

    return (
        <div>
            <div>
                <div className='flex justify-center mt-5'>
                    <div className="relative inline-block">
                        <img
                            src={contactDetail.avatar || "/avatar/Profile.png"}
                            alt={contactDetail.name}
                            className="w-[100px] h-[100px] rounded-lg object-cover"
                        />
                        <span
                            className={`absolute bottom-0 right-0 w-4.5 h-4.5 ${contactDetail.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                                } border-2 border-white rounded-full z-10`}
                        />
                    </div>
                </div>

                <div className='flex justify-center mt-6 font-bold text-xl'>
                    {contactDetail.name}
                    {is_favorite &&
                        <StarOutlined />}
                </div>

                {contactDetail.bio && (
                    <div className="flex justify-center mt-2 font-semibold text-sm text-gray-400">
                        {contactDetail.bio}
                    </div>
                )}

                {contactDetail.status === 'online' ? (
                    <div className="flex justify-center mt-2 font-semibold text-green-500 text-sm">
                        在线
                    </div>
                ) : (
                    contactDetail.lastSeen &&
                    contactDetail.lastSeen !== '' &&
                    !isNaN(Date.parse(contactDetail.lastSeen)) && (
                        <div className="flex justify-center mt-2 font-semibold text-gray-500 text-sm">
                            最后在线: {new Date(contactDetail.lastSeen).toLocaleString('zh-CN')}
                        </div>
                    )
                )}
            </div>
            {!isFriend && (
                <div className='flex justify-center mt-10'>
                    <button
                        className="px-6 py-2.5 text-sm text-white bg-blue-500 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors max-w-60 w-full"
                        onClick={async () => {
                            try {
                                const token = localStorage.getItem('token');
                                if (token && chatWith) {
                                    await addContact(token, chatWith.id);
                                    // 添加成功后，重新获取联系人详情
                                    try {
                                        const data = await getContactDetail(token, chatWith.id);
                                        setContactDetail(data);
                                        setIsFavorite(data!.is_favorite);
                                        setIsFriend(true);
                                        setAlertVisible(true);
                                        setTimeout(() => setAlertVisible(false), 3000);
                                    } catch (err) {
                                        console.error('获取联系人详情失败:', err);
                                    }
                                }
                            } catch (error) {
                                console.error('添加好友失败:', error);
                                alert(error instanceof Error ? error.message : '添加好友失败');
                            }
                        }}>
                        添加好友
                    </button>
                </div>
            )}
            {isFriend && (
                <div className='overflow-hidden rounded-lg'>
                    <div className="flex flex-col">
                        {[{ label: '切换特别关心状态' },].map((item) => (
                            <div
                                key={item.label}
                                className="flex justify-center self-center px-2.5 py-2.5 text-sm text-gray-700 cursor-pointer bg-gray-50 border-2 border-slate-100 mt-10 max-w-60 rounded-xl"
                                onClick={() => {
                                    switch (item.label) {
                                        case '切换特别关心状态':
                                            try {
                                                const token = localStorage.getItem('token');
                                                if (token) {
                                                    toggleFavorite(token, chatWith!.id);
                                                    setIsFavorite(prev => !prev);
                                                    setAlertVisible(true);
                                                    setTimeout(() => setAlertVisible(false), 3000);
                                                }
                                            } catch (error) {
                                                console.error('设置失败:', error);
                                            } finally {
                                            }
                                            break;
                                        default:
                                            break;
                                    }
                                }}>
                                <span>{item.label}</span>
                            </div>
                        ))}
                        <div className='flex justify-center'>
                            <button className="px-4 py-2 text-sm text-red-400 bg-white rounded-md cursor-pointer max-w-36 w-full"
                                onClick={async () => { showModal() }}>
                                <span>删除联系人</span>
                            </button>
                        </div>

                        <div className='flex justify-center mt-20'>
                            <button
                                className="px-4 py-2 text-sm text-white bg-green-400 rounded-md cursor-pointer max-w-36 w-full"
                                onClick={() => {
                                    setOpenCallPage(true);
                                    setActiveMenu("发起通话")
                                }
                                }>
                                发起语音通话
                            </button>
                        </div>
                        <div className='flex justify-center mt-2'>
                            <button
                                className="px-4 py-2 text-sm text-white bg-green-400 rounded-md cursor-pointer max-w-36 w-full"
                                onClick={() => {
                                    setActiveMenu("聊天详情")
                                }
                                }>
                                发起聊天
                            </button>
                        </div>
                    </div>
                    {isModalOpen === true &&
                        <Modal
                            title="删除联系人"
                            closable={{ 'aria-label': 'Custom Close Button' }}
                            open={isModalOpen}
                            onOk={handleOk}
                            onCancel={handleCancel}
                        >
                            <p>确认要删除该联系人吗</p>
                        </Modal>}
                </div>
            )}
            {alertVisible && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <Alert message="设置成功" type="success" className="shadow-lg" />
                </div>
            )}
            {openCallPage && (
                <Callpage
                    setActiveMenu={setActiveMenu}
                    activeMenu={activeMenu}
                    chatWith={chatWith}
                />
            )}
        </div>
    );
}