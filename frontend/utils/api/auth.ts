// 统一后端地址
import SERVER_CONFIG from '@/config/server';
const BASE_URL = `${SERVER_CONFIG.API_BASE_URL}/api/auth`;

export interface UserResponse {
  id: number;
  username: string;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
}

// 1. 注册
export async function registerUser(username: string, password: string, phone: string) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, phone }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "注册失败");
  return res.json(); // {id, username}
}

// 2. 登录（支持用户名或手机号）
export async function loginUser(identifier: string, password: string, isPhone: boolean = false) {
  const body = isPhone
    ? { phone: identifier, password }
    : { username: identifier, password };

  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "登录失败");
  return res.json(); // {access_token, token_type}
}

// 3. 带 token 拿当前用户
export async function getMe(token: string) {
  const res = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Token 无效");
  return res.json(); // {id, username}
}

// 4. 上传头像
export async function uploadAvatar(token: string, file: File) {
  // 动态导入压缩工具
  const { compressImage } = await import('@/utils/imageCompressor');
  
  // 压缩图片（质量50%，最大宽度800px）
  const compressedFile = await compressImage(file, {
    quality: 0.5,
    maxWidth: 800,
    maxHeight: 800,
  });

  const formData = new FormData();
  formData.append('avatar', compressedFile);

  const res = await fetch(`${BASE_URL}/me/avatar`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "上传失败");
  }
  return res.json(); // 返回更新后的用户信息
}

// 5. 更新个性签名
export async function uploadBio(token: string, bio: string): Promise<UserResponse> {
  const res = await fetch(`${BASE_URL}/me/bio`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bio }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || '更新失败');
  return res.json(); // 返回更新后的用户信息
}

// 6. 更新用户名
export async function uploadUsername(token: string, username: string): Promise<UserResponse> {
  const res = await fetch(`${BASE_URL}/me/username`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || '更新失败');
  return res.json();
}

// 7. 登出
export async function logoutUser(token: string) {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error((await res.json()).detail || "登出失败");
  return res.json();
}

// 8.搜索用户
export async function searchUsers(token: string, keyword: string) {
  // 至少一个字符才发请求，也可在前层做
  if (!keyword.trim()) return [];

  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(keyword)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error((await res.json()).detail || "搜索失败");
  return res.json() as Promise<UserResponse[]>;
}

// 9. 设置在线状态
export async function setOnlineStatus(token: string, status: 'online' | 'offline') {
  const res = await fetch(`${BASE_URL}/me/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || '设置状态失败');
  return res.json();
}