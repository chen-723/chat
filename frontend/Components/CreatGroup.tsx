//创建群聊弹窗

import { creatGroups } from "@/utils/api/group";
import Alert from 'antd/es/alert/Alert';
import { useState } from "react";

type Props = {
    onGroupsUpdate?: () => void
    onClose: () => void
}

export default function CreatGroup({ onGroupsUpdate, onClose }: Props) {

    const [creatGroupsForm, setGroupsForm] = useState({ name: '新建群聊', description: '群主很懒，什么都没写' });
    const [alertVisible, setAlertVisible] = useState(false);

    return (
        <div className='fixed inset-0 z-50 bg-white/30 backdrop-blur-xs flex items-center justify-center mb-20' onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md"
                onClick={(e) => e.stopPropagation()}>

                <h1 className='flex items-center justify-center'>新建群</h1>
                <div>
                    <div className='text-sm'>群名</div>
                    <input className="w-full border-gray-200 text-sm py-3 rounded-md pl-2 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-100"
                        placeholder="设置群名称"
                        value={creatGroupsForm.name}
                        onChange={(e) =>
                            setGroupsForm({ ...creatGroupsForm, name: e.target.value })
                        }
                    />
                    <div className='text-sm mt-2'>群简介</div>
                    <textarea
                        className="w-full border-gray-200 text-sm py-2.5 rounded-md pl-2 ring-gray-200 focus:ring-2 focus:outline-none bg-gray-100"
                        placeholder="请输入文本"
                        value={creatGroupsForm.description}
                        onChange={(e) =>
                            setGroupsForm({ ...creatGroupsForm, description: e.target.value })
                        }
                        rows={1}
                    ></textarea>
                </div>
                <div>
                    <button
                        className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                        onClick={async () => {
                            onClose();
                            setGroupsForm({ name: '新建群聊', description: '群主很懒，什么都没写' });
                            const token = localStorage.getItem('token');
                            if (!token) return;
                            await creatGroups(
                                token,
                                creatGroupsForm.name || '新建群聊',
                                creatGroupsForm.description || '群主很懒，什么都没写'
                            );
                            onGroupsUpdate?.(); // 通知父组件刷新群聊列表
                            setAlertVisible(true);
                            setTimeout(() => setAlertVisible(false), 3000);
                        }}>
                        确定
                    </button>
                    <button
                        className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                        onClick={() => {
                            onClose();
                            setGroupsForm({ name: '新建群聊', description: '群主很懒，什么都没写' })
                        }}>
                        取消
                    </button>
                </div>
            </div>
            {alertVisible && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <Alert message="创建成功" type="success" className="shadow-lg" />
                </div>
            )}
        </div>
    )
}