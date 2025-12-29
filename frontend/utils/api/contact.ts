// 联系人相关 API
import SERVER_CONFIG from '@/config/server';
const BASE_URL = `${SERVER_CONFIG.API_BASE_URL}/api/contacts`;

// 联系人数据类型
export interface Contact {
  id: number;  // 联系人关系表 ID
  user_id: number;  // 联系人的真实用户 ID
  name: string;
  avatar: string | null;
  status: "online" | "offline";
  bio: string | null
  lastSeen: string | null;
  lastMegTime: string | null;
  lastMeg: string | null;
  count: number | null;
  is_favorite: boolean;
}

// 1. 获取联系人列表
export async function getContacts(token: string): Promise<Contact[]> {
  const res = await fetch(BASE_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("获取联系人失败");
  return res.json();
}

// 2. 添加联系人
export async function addContact(token: string, contactUserId: number) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ contact_user_id: contactUserId }),
  });
  if (res.ok) return res.json();

  const detail = await res.text();
  throw new Error(detail);
}

// 3. 删除联系人
export async function removeContact(token: string, contactUserId: number) {
  const res = await fetch(`${BASE_URL}/${contactUserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("删除联系人失败");
  return;
}

// 4. 切换特别关心
export async function toggleFavorite(token: string, contactUserId: number) {
  const res = await fetch(`${BASE_URL}/${contactUserId}/favorite`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("操作失败");
  return res.json();
}


// 5. 获取指定联系人详情
export async function getContactDetail(token: string, contactUserId: number): Promise<Contact | null> {
  const res = await fetch(`${BASE_URL}/${contactUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// 5. 获取特别关心列表
// export async function getFavorites(token: string): Promise<Contact[]> {
//   const res = await fetch(`${BASE_URL}/favorites`, {
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error("获取特别关心列表失败");
//   return res.json();
// }
