import SERVER_CONFIG from '@/config/server';
const BASE_URL = `${SERVER_CONFIG.API_BASE_URL}/api/groups`;

export interface GroupMessages {
    id: number;
    sender_id: number;
    group_id: number;
    content: string;
    msg_type: number;
    is_read: boolean;
    created_at: string;
    updated_at: string;
}

// export interface GetGroupMessagesParams { //没用上
//     last_id?: number; // 上次最后一条消息ID（可选，用于分页）
//     limit?: number;   // 每页条数（默认30，最大100）
// }

// 接口实际返回
export interface GroupMessagePage {
    items: GroupMessages[];
    has_more: boolean;
    last_id: number;
}

export interface SendMessageBody {
    //   receiver_id: number;
    content: string;
    msg_type?: number;
}

//获取指定群聊天历史 `GET /api/groups/1/messages?last_id=100&limit=99`
export async function getGroupMessages(token: string, group_id: number): Promise<GroupMessagePage> {
    const res = await fetch(`${BASE_URL}/${group_id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('获取消息列表失败');
    return res.json();
}

//群消息发送 POST /api/groups/{group_id}/messages`
export async function sendGroupMessages(token: string, group_id: number, body: SendMessageBody): Promise<GroupMessages> {
    // 后端使用 query parameters 接收参数
    const params = new URLSearchParams({
        content: body.content,
        msg_type: String(body.msg_type ?? 1),
    });

    const res = await fetch(`${BASE_URL}/${group_id}/messages?${params.toString()}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const msg = await res.text().catch(() => '发送失败');
        throw new Error(msg);
    }
    return res.json();
}