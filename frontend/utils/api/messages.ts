// 聊天信息相关 API
import SERVER_CONFIG from '@/config/server';
const BASE_URL = `${SERVER_CONFIG.API_BASE_URL}/api/messages`;

//聊天信息模型
export interface Message {          // 单条消息，建议用单数名字
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  msg_type: number;
  is_read: boolean;
  created_at: string;
}

export interface MessagePage {      // 分页包裹
  items: Message[];              // 这里是 Message[]
  has_more: boolean;
  last_id: number;
}

export interface SendMessageBody {
  receiver_id: number;
  content: string;
  msg_type?: number;
}

// 1. 获取聊天历史
export async function getMessages(token: string, receiver_Id: number): Promise<MessagePage> {
  const res = await fetch(`${BASE_URL}/history/${receiver_Id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('获取消息列表失败');
  return res.json();
}

//2. 发送消息
export async function sendMessages(token: string, body: SendMessageBody): Promise<Message> {
  const res = await fetch(`${BASE_URL}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '发送失败');
    throw new Error(msg);
  }
  return res.json();
}

// 3 . 设置未读为已读
export async function readMessages(token: string, peer_user_id: number) {
  const res = await fetch(`${BASE_URL}/read/${peer_user_id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("操作失败");
  return res.json();
}

// 4. 获取当前用户全部未读信息数
export async function allunread(token: string) {
  const res = await fetch(`${BASE_URL}/unread`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('获取总未读数失败');
  return res.json();
}

// 5. 上传图片，语音，文件
export async function uploadFile(token: string, file: File): Promise<string> {
  let fileToUpload = file;

  // 如果是图片，先压缩
  if (file.type.startsWith('image/')) {
    const { compressImage } = await import('@/utils/imageCompressor');
    fileToUpload = await compressImage(file, {
      quality: 0.5,
      maxWidth: 1920,
      maxHeight: 1920,
    });
  }

  const fd = new FormData();
  fd.append('file', fileToUpload);
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || '上传失败');
  }
  const { url } = await res.json();
  return url;
}

//6.特殊发送
export async function sendImage(token: string, receiver_id: number, file: File): Promise<Message> {
  const url = await uploadFile(token, file);
  return sendMessages(token, {
    receiver_id,
    content: url,
    msg_type: 2,          // 2=图片  3=语音  4=文件
  });
}

// 搜索结果类型
export interface MessageSearchResult {
  message_id: number;
  content: string;
  msg_type: number;
  created_at: string;
  chat_type: "private" | "group";
  sender: {
    id: number;
    username: string;
    avatar: string | null;
  };
  chat_info: {
    // 私聊时的字段
    peer_user_id?: number;
    peer_username?: string;
    peer_avatar?: string | null;
    // 群聊时的字段
    group_id?: number;
    group_name?: string;
    group_avatar?: string | null;
  };
}

// 搜索聊天记录
export async function searchMessages(
  token: string,
  keyword: string,
  limit: number = 50
): Promise<MessageSearchResult[]> {
  // 至少一个字符才发请求
  if (!keyword.trim()) return [];

  const params = new URLSearchParams({
    keyword: keyword.trim(),
    limit: limit.toString(),
  });

  const res = await fetch(`${BASE_URL}/search?${params}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "搜索失败");
  }

  return res.json() as Promise<MessageSearchResult[]>;
}