import SERVER_CONFIG from '@/config/server';
const BASE_URL = `${SERVER_CONFIG.API_BASE_URL}/api/groups`;

export interface Groups {
    id: number;
    name: string;
    avatar: string | null;
    owner_id: number;
    description: string | null;
    created_at: string
    member_count: number
}

export interface GroupMember {
    id: number;
    user_id: number;
    username: string;
    avatar: string;
    role: number;
    joined_at: string;
}

// 整个群成员列表就是 GroupMember[]
export type GroupMembers = GroupMember[];

// 创建群聊
export async function creatGroups(token: string, groups_name: string, groups_description: string) {
    const res = await fetch(`${BASE_URL}/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groups_name, description: groups_description }),
    });
    if (res.ok) return res.json();
}

// 获取全部群聊
export async function getGroups(token: string): Promise<Groups[]> {
    const res = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("获取群聊列表失败");
    return res.json();
}

// 获取指定id群聊
export async function getGroupsdatal(token: string, group_id: number): Promise<Groups> {
    const res = await fetch(`${BASE_URL}/${group_id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('获取群聊详细失败');
    return res.json();
}

//修改群聊资料
export async function changeGroups(token: string, group_id: number, payload: Partial<Pick<Groups, 'name' | 'avatar' | 'description'>>
): Promise<Groups> {
    const res = await fetch(`${BASE_URL}/${group_id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '修改失败');
    }
    return res.json() as Promise<Groups>; // 返回更新后的群组信息
}

//群主删除这个群(解散)
export async function deleteGroups(token: string, group_id: number) {
    const res = await fetch(`${BASE_URL}/${group_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("删除群聊失败");
    return;
}

// 获取群成员列表
export async function getGroupMembers(token: string, group_id: number): Promise<GroupMember[]> {
    const res = await fetch(`${BASE_URL}/${group_id}/members`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('获取群成员列表失败');
    return res.json();
}

//邀请成员
export async function addGroupMembers(token: string, groups_id: number, user_id: number) {
    const res = await fetch(`${BASE_URL}/${groups_id}/members/${user_id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}: 添加成员失败`);
    }
    return res.json();
}

//退出群聊`DELETE /api/groups/{group_id}/members/{user_id}`
export async function quitGroups(token: string, group_id: number, user_id: number) {
    const res = await fetch(`${BASE_URL}/${group_id}/members/${user_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "退出群聊失败");
    }
    return res.json();
}

//更新群成员 `PUT /api/groups/{group_id}/members/{user_id}/role`
export async function changeMembersRole(token: string, group_id: number, user_id: number, role: 2 | 3
): Promise<GroupMember> {
    const res = await fetch(`${BASE_URL}/${group_id}/members/${user_id}/role`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '修改失败');
    }
    return res.json() as Promise<GroupMember>;
}


//搜索群
export async function searchGroups(token: string, keyword: string): Promise<Groups[]> {
  // 至少一个字符才发请求，也可在前层做
  if (!keyword.trim()) return [];

  const res = await fetch(`${BASE_URL}/search?keyword=${encodeURIComponent(keyword)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "搜索失败");
  }
  
  return res.json() as Promise<Groups[]>;
}

// 上传群头像
export async function uploadGroupAvatar(token: string, groupId: number, file: File): Promise<{ url: string; group: Groups }> {
  // 压缩图片（质量50%，最大宽度800px）
  const { compressImage } = await import('@/utils/imageCompressor');
  const compressedFile = await compressImage(file, {
    quality: 0.5,
    maxWidth: 800,
    maxHeight: 800,
  });

  const formData = new FormData();
  formData.append('avatar', compressedFile);

  const res = await fetch(`${BASE_URL}/${groupId}/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || '上传群头像失败');
  }

  return res.json();
}