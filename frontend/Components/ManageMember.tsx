//管理群成员

import { GroupMember, quitGroups, changeMembersRole } from '@/utils/api/group';
import SERVER_CONFIG from '@/config/server';
import { useState } from 'react';
import Modal from 'antd/es/modal/Modal';
import Alert from 'antd/es/alert/Alert';

type Props = {
    onClose: () => void;
    chatWith: { name: string; id: number; avatar: string | null } | null;
    selectedMember: GroupMember; // 被选中要管理的成员
    currentUserRole: number; // 当前用户的角色（1-群主，2-管理员）
    onMemberUpdated?: () => void; // 成员信息更新后的回调
}

export default function ManageMember({ onClose, chatWith, selectedMember, currentUserRole, onMemberUpdated }: Props) {

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);

    // 处理头像URL：如果是相对路径，拼接base URL
    const avatarUrl = selectedMember.avatar
        ? (selectedMember.avatar.startsWith('http') ? selectedMember.avatar : `${SERVER_CONFIG.API_BASE_URL}${selectedMember.avatar}`)
        : "/avatar/Profile.png";

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await quitGroups(token, chatWith!.id, selectedMember.user_id);

            // 触发群列表刷新
            const { wsClient } = await import('@/utils/websocket');
            wsClient.trigger('group_list_update');

            // 通知父组件刷新成员列表
            onMemberUpdated?.();

            setAlertVisible(true);
            setTimeout(() => {
                setAlertVisible(false);
                onClose(); // 关闭管理弹窗
            }, 1500);
        } catch (error) {
            console.error('移除失败:', error);
            alert(error instanceof Error ? error.message : '移除失败');
        }
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    return (
        <div className='fixed inset-0 z-50 bg-white/30 backdrop-blur-xs flex items-center justify-center mb-20' onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md"
                onClick={(e) => e.stopPropagation()}>

                <h1 className='flex items-center justify-center text-lg font-bold mb-4'>
                    管理成员
                </h1>

                {/* 成员信息 */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                        <img
                            src={avatarUrl}
                            alt={selectedMember.username}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/avatar/Profile.png";
                            }}
                        />
                        <div>
                            <p className="font-semibold text-gray-800">{selectedMember.username}</p>
                            <p className="text-sm text-gray-500">
                                {selectedMember.role === 1 ? '群主' : selectedMember.role === 2 ? '管理员' : '普通成员'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 管理操作 */}
                <div className="space-y-2">
                    {/* 群主可以设置/取消管理员 */}
                    {currentUserRole === 1 && selectedMember.role !== 1 && (
                        <button
                            className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200"
                            onClick={async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    if (!token) return;
                                    const newRole = selectedMember.role === 2 ? 3 : 2;

                                    await changeMembersRole(token, chatWith!.id, selectedMember.user_id, newRole);

                                    // 通知父组件刷新成员列表
                                    onMemberUpdated?.();

                                    setAlertVisible(true);
                                    setTimeout(() => {
                                        setAlertVisible(false);
                                        onClose(); // 关闭管理弹窗
                                    }, 1500);

                                    console.log('设置/取消管理员:', selectedMember, '新角色:', newRole);
                                } catch (error) {
                                    console.error('操作失败:', error);
                                    alert(error instanceof Error ? error.message : '操作失败');
                                }
                            }}>
                            {selectedMember.role === 2 ? '取消管理员' : '设为管理员'}
                        </button>
                    )}

                    {/* 移除成员 */}
                    <button
                        className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200"
                        onClick={() => {
                            // TODO: 实现移除成员功能
                            showModal();
                            console.log('移除成员:', selectedMember);
                        }}>
                        移除成员
                    </button>
                </div>

                {/* 取消按钮 */}
                <div className="mt-4 flex justify-center">
                    <button
                        className="px-6 py-2 text-sm text-gray-700 hover:text-gray-900"
                        onClick={onClose}>
                        取消
                    </button>
                </div>
            </div>
            {isModalOpen === true &&
                <Modal
                    title="移出群聊"
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    open={isModalOpen}
                    onOk={handleOk}
                    onCancel={handleCancel}
                >
                    <p>确认要移出该群聊吗？</p>
                </Modal>}
            {alertVisible && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <Alert message="设置成功" type="success" className="shadow-lg" />
                </div>
            )}
        </div>
    )
}