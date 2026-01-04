//群资料详细页

import { getGroupsdatal, Groups, changeGroups, getGroupMembers, GroupMembers, quitGroups } from '@/utils/api/group'
import Alert from 'antd/es/alert/Alert';
import Modal from 'antd/es/modal/Modal';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import SERVER_CONFIG from '@/config/server';
import AddGroupMember from './AddGroupMember';
import ManageMember from './ManageMember';
import { getMe } from '@/utils/api/auth';
import InitialsAvatar from './InitialsAvatar';

type Props = {
    activeMenu: string;
    setActiveMenu: (menu: string, from?: string) => void,
    chatWith: { name: string; id: number; avatar: string | null } | null;
    editType?: 'name' | 'description' | null;
    onEditComplete?: () => void;
    groupAvatarUpdateTrigger?: number;
    setChatWith?: (contact: { name: string; id: number; avatar: string | null } | null, savePrevious?: boolean) => void;
    from?: string;
};

export default function GroupsDetail({ activeMenu, setActiveMenu, chatWith, editType, onEditComplete, groupAvatarUpdateTrigger, setChatWith, from }: Props) {
    const [groupDetail, setGroupDetail] = useState<Groups | null>(null);
    const [groupMembersdata, setGroupMembersdata] = useState<GroupMembers | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [nameValue, setNameValue] = useState<string>('');
    const [descriptionValue, setDescriptionValue] = useState<string>('');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputRef = useRef<HTMLInputElement>(null);

    const [addMember, setAddMember] = useState(false);
    const [memberUpdateTrigger, setMemberUpdateTrigger] = useState(0);
    const [openManage, setOpenManage] = useState(false);
    const [selectedMember, setSelectedMember] = useState<GroupMembers[0] | null>(null); // 被选中要管理的成员

    const [user, setUser] = useState({} as any);
    const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<number>(3); // 默认普通成员

    const showModal = () => {
        setIsModalOpen(true);
    };
    //退出群聊的确认函数
    const handleOk = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await quitGroups(token, chatWith!.id, user.id);

            const { wsClient } = await import('@/utils/websocket');
            wsClient.trigger('group_list_update');

            setActiveMenu(from || "聊天");
            setAlertVisible(true);
            setTimeout(() => setAlertVisible(false), 3000);
        } catch (error) {
            console.error('退出失败:', error);
            alert(error instanceof Error ? error.message : '退出失败');
        }
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    useEffect(() => {
        if (activeMenu !== '群资料' || !chatWith) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        (async () => {
            const me = await getMe(token);
            setUser(me);
            try {
                const data = await getGroupsdatal(token, chatWith.id);
                const GroupMembersdata = await getGroupMembers(token, chatWith.id);
                setGroupDetail(data);
                setGroupMembersdata(GroupMembersdata);

                // 判断当前用户是否为群主或管理员
                const currentUserMember = GroupMembersdata.find(member => member.user_id === me.id);
                if (currentUserMember) {
                    setCurrentUserRole(currentUserMember.role);
                    if (currentUserMember.role === 1 || currentUserMember.role === 2) {
                        setIsAdminOrOwner(true);
                    } else {
                        setIsAdminOrOwner(false);
                    }
                }

                console.log('群资料:', data);
                console.log('群成员', GroupMembersdata);
                console.log('当前用户权限:', currentUserMember?.role === 1 ? '群主' : currentUserMember?.role === 2 ? '管理员' : '普通成员');
            } catch (err) {
                console.error('获取群资料失败:', err);
            }
        })();
    }, [activeMenu, chatWith, groupAvatarUpdateTrigger, memberUpdateTrigger]);

    // 当进入编辑模式时，设置初始值并聚焦
    useEffect(() => {
        if (editType === 'name') {
            setNameValue(groupDetail?.name ?? '');
            setTimeout(() => nameInputRef.current?.focus(), 100);
        } else if (editType === 'description') {
            setDescriptionValue(groupDetail?.description ?? '');
            setTimeout(() => descriptionInputRef.current?.focus(), 100);
        }
    }, [editType, groupDetail?.name, groupDetail?.description]);

    const handleSave = async () => {
        const token = localStorage.getItem('token');
        if (!token || !chatWith) return;

        try {
            if (editType === 'name') {
                await changeGroups(token, chatWith.id, { name: nameValue });
                setGroupDetail((prev) => prev ? { ...prev, name: nameValue } : null);
            } else if (editType === 'description') {
                await changeGroups(token, chatWith.id, { description: descriptionValue });
                setGroupDetail((prev) => prev ? { ...prev, description: descriptionValue } : null);
            }
            onEditComplete?.();
            setAlertVisible(true);
            setTimeout(() => setAlertVisible(false), 3000);
        } catch (error) {
            console.error('保存失败:', error);
            alert(error instanceof Error ? error.message : '保存失败');
        }
    };

    if (activeMenu !== "群资料") return null;

    // 加载中状态

    return (
        <div>
            <div>
                <div className='flex justify-center mt-5'>
                    <div className="relative inline-block">
                        {groupDetail?.avatar ? (
                            <img
                                src={groupDetail.avatar}
                                alt={groupDetail.name}
                                className="w-[100px] h-[100px] rounded-lg object-cover"
                            />
                        ) : (
                            <InitialsAvatar name={groupDetail?.name || "群聊"} size={100} className="rounded-lg" />
                        )}
                    </div>
                </div>
                {groupDetail?.created_at && (
                    <div className='flex justify-center mt-2 font-semibold text-gray-500 text-sm'>
                        创建时间: {dayjs(groupDetail.created_at).format('YYYY-MM-DD')}
                    </div>
                )}
            </div>
            {editType === 'name' ? (
                <div className="flex justify-center mt-2 px-4">
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSave();
                            } else if (e.key === 'Escape') {
                                setNameValue(groupDetail?.name || '');
                                onEditComplete?.();
                            }
                        }}
                        maxLength={50}
                        className="w-80 text-center px-3 py-1 text-xl font-bold text-gray-700 border-b-2 border-blue-300 focus:outline-none bg-gray-50"
                    />
                </div>
            ) : (
                <div className='flex justify-center mt-6 font-bold text-xl'>
                    {groupDetail?.name || "群聊名称"}
                </div>
            )}

            {editType === 'description' ? (
                <div className="flex justify-center mt-2 px-4">
                    <input
                        ref={descriptionInputRef}
                        type="text"
                        value={descriptionValue}
                        onChange={(e) => setDescriptionValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSave();
                            } else if (e.key === 'Escape') {
                                setDescriptionValue(groupDetail?.description || '');
                                onEditComplete?.();
                            }
                        }}
                        maxLength={255}
                        className="w-80 text-center px-3 py-1 text-sm font-semibold text-gray-700 border-b-2 border-blue-300 focus:outline-none bg-gray-50 "
                    />
                </div>
            ) : (
                <div className="flex justify-center mt-2 font-semibold text-sm text-gray-400">
                    群简介: {groupDetail?.description || '暂无简介'}
                </div>
            )}

            <div
                className="flex flex-col mt-4 space-y-4 w-full overflow-y-auto scrollbar-hide max-h-[calc(100vh-438px)] bg-gray-50 border border-blue-100/50"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}>
                {groupMembersdata?.map((item) => {
                    return (
                        <div key={item.id} className="flex items-center space-x-4 border-b border-gray-100 h-17 pb-3 shrink-0 px-3 cursor-pointer hover:bg-gray-50"
                            onClick={() => {
                                // 如果点击的是自己，跳转到用户页面
                                if (item.user_id === user.id) {
                                    setActiveMenu('用户');
                                    return;
                                }

                                // 跳转到该成员的联系人详情页，保存当前群信息
                                setChatWith?.({
                                    name: item.username,
                                    id: item.user_id,
                                    avatar: item.avatar
                                }, true); // 传递 true 表示保存当前 chatWith
                                setActiveMenu('联系人详情', '群资料');
                            }}>
                            {/* 头像 + */}
                            <div className="relative shrink-0">
                                {item.avatar ? (
                                    <img
                                        src={item.avatar.startsWith('http') ? item.avatar : `${SERVER_CONFIG.API_BASE_URL}${item.avatar}`}
                                        alt={item.username}
                                        className="w-12 h-12 rounded-lg object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                                const avatar = document.createElement('div');
                                                parent.appendChild(avatar);
                                            }
                                        }}
                                    />
                                ) : (
                                    <InitialsAvatar name={item.username} size={48} className="rounded-lg" />
                                )}
                            </div>

                            {/* 右侧信息 */}
                            <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex justify-between items-baseline gap-2">
                                    <div>
                                        <div className='flex items-center gap-2'>
                                            <p className="text-gray-700 font-semibold truncate">
                                                {item.username}
                                            </p>
                                            {item.user_id === user.id &&
                                                (
                                                    <p className="text-xs text-gray-500">我</p>
                                                )}
                                        </div>

                                        <p className="text-sm text-gray-300 line-clamp-2 overflow-hidden">
                                            加入时间: {dayjs(item.joined_at).format('YYYY-MM-DD')}
                                        </p>
                                    </div>
                                    <div className="relative text-right">
                                        <p className="text-sm font-medium text-gray-700 shrink-0 mr-4">
                                            {item.role === 1 ? '群主' : item.role === 2 ? '管理员' : '成员'}
                                        </p>
                                        {isAdminOrOwner &&
                                            user.id !== item.user_id &&
                                            (
                                                (currentUserRole === 1) ||
                                                (currentUserRole === 2 && item.role === 3)
                                            ) && (
                                                <p className="absolute top-full right-4 text-xs text-blue-500 whitespace-nowrap cursor-pointer hover:text-blue-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMember(item); // 保存被选中的成员信息
                                                        setOpenManage(true);
                                                    }}>
                                                    成员设置
                                                </p>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div
                className="flex justify-center px-2.5 py-2 text-sm text-green-600 cursor-pointer bg-white hover:bg-red-50 z-10"
                onClick={async () => {
                    setAddMember(true);
                }
                }>
                <span>邀请成员</span>
            </div>
            <div
                className="flex justify-center px-2.5 py-2 text-sm text-red-500 cursor-pointer bg-white hover:bg-red-50 z-10 mt-5"
                onClick={async () => { showModal() }}>
                <span>退出群聊</span>
            </div>
            {openManage && selectedMember &&
                <ManageMember
                    onClose={() => {
                        setOpenManage(false);
                        setSelectedMember(null); // 关闭时清空选中的成员
                    }}
                    chatWith={chatWith}
                    selectedMember={selectedMember}
                    currentUserRole={currentUserRole}
                    onMemberUpdated={() => {
                        setMemberUpdateTrigger(prev => prev + 1); // 刷新成员列表
                    }}
                />
            }
            {isModalOpen === true &&
                <Modal
                    title="退出群聊"
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    open={isModalOpen}
                    onOk={handleOk}
                    onCancel={handleCancel}
                >
                    <p>确认要退出该群聊吗？</p>
                </Modal>}
            {alertVisible && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <Alert message="设置成功" type="success" className="shadow-lg" />
                </div>
            )}
            {addMember &&
                <AddGroupMember
                    onClose={() => setAddMember(false)}
                    groupDetailId={groupDetail!.id}
                    onMemberAdded={async () => {
                        setMemberUpdateTrigger(prev => prev + 1);
                        // 触发群列表刷新
                        const { wsClient } = await import('@/utils/websocket');
                        wsClient.trigger('group_list_update');
                    }}
                />
            }
        </div>
    );
}