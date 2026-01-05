'use client';
import { useState, useEffect } from 'react';
import Top from '@/Components/Top';
import Foot from '@/Components/Foot';
import Contacts from '@/Components/Contacts';
import Chats from '@/Components/Chats';
import Profile from '@/Components/Profile';
import ChatWindow from '@/Components/ChatWindow';
import Login from '@/Components/Login';
import Search from '@/Components/Search';
import ContactDetail from '@/Components/ContactDetail'
import GroupsDetail from '@/Components/GroupsDetail'
import Callpage from '@/Components/Callpage';
import { setupIOSInputFix } from '@/utils/iosInputFix';

export default function Home() {

  const [activeMenu, setActiveMenu] = useState<string>('聊天');
  const [chatWith, setChatWith] = useState<{ name: string; id: number; avatar: string | null } | null>(null);
  const [previousChatWith, setPreviousChatWith] = useState<{ name: string; id: number; avatar: string | null } | null>(null);
  const [from, setFrom] = useState<string>();
  const [ShowLogin, setShowLogin] = useState<boolean>(false);
  const [avatarUpdateTrigger, setAvatarUpdateTrigger] = useState<number>(0);
  const [groupAvatarUpdateTrigger, setGroupAvatarUpdateTrigger] = useState<number>(0);
  const [groupsRefreshTrigger, setGroupsRefreshTrigger] = useState(0);
  const [editType, setEditType] = useState<'avatar' | 'username' | 'bio' | 'id' | null>(null);
  const [editGroupType, setEditGroupType] = useState<'name' | 'description' | null>(null);
  const [totalUnread, setTotalUnread] = useState<number>(0);
  const [groupUnread, setGroupUnread] = useState<number>(0);

  // 包装 setActiveMenu 以支持 from 参数和恢复 chatWith
  const handleSetActiveMenu = (menu: string, fromPage?: string) => {
    // 如果返回到群资料，且有保存的 previousChatWith，恢复它
    if (menu === '群资料' && previousChatWith) {
      setChatWith(previousChatWith);
      setPreviousChatWith(null);
    }

    setActiveMenu(menu);
    if (fromPage) {
      setFrom(fromPage);
    }
  };

  // 包装 setChatWith 以支持保存当前 chatWith
  const handleSetChatWith = (newChatWith: { name: string; id: number; avatar: string | null } | null, savePrevious?: boolean) => {
    if (savePrevious && chatWith) {
      setPreviousChatWith(chatWith);
    }
    setChatWith(newChatWith);
  };

  useEffect(() => {
    // iOS 输入框修复
    const cleanup = setupIOSInputFix();
    
    // 只处理"页面刷新时已有 token"的情况
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (token && !ShowLogin) {
        try {
          const { getMe } = await import('@/utils/api/auth');
          await getMe(token);
          
          // 建立WebSocket连接
          const { wsClient } = await import('@/utils/websocket');
          wsClient.connect(token);

          // 初始加载未读数
          const { allunread } = await import('@/utils/api/messages');
          const unreadData = await allunread(token);
          setTotalUnread(unreadData.total || 0);
          
          setShowLogin(true); // token 有效，显示主界面
        } catch (error) {
          // token 无效或过期，清除并显示登录页
          localStorage.removeItem('token');
          setShowLogin(false);
        }
      }
    };
    validateToken();

    // 监听页面关闭/刷新事件，设置离线状态
    const handleBeforeUnload = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { setOnlineStatus } = await import('@/utils/api/auth');
          // 使用 sendBeacon 确保请求能在页面卸载前发送
          const blob = new Blob([JSON.stringify({ status: 'offline' })], { type: 'application/json' });
          const SERVER_CONFIG = (await import('@/config/server')).default;
          navigator.sendBeacon(`${SERVER_CONFIG.API_BASE_URL}/api/auth/me/status`, blob);
        } catch (error) {
          console.error('设置离线状态失败:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 组件卸载时关闭WebSocket
    return () => {
      cleanup?.();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      import('@/utils/websocket').then(({ wsClient }) => {
        wsClient.close();
      });
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* <Test /> */}

      <Login
        ShowLogin={ShowLogin}
        setShowLogin={setShowLogin}
        setTotalUnread={setTotalUnread}
      />
      {ShowLogin &&           //登录才显示
        <div>
          <Top activeMenu={activeMenu}
            setActiveMenu={handleSetActiveMenu}
            setChatWith={handleSetChatWith}
            chatWith={chatWith}
            from={from}
            onAvatarUpdate={() => setAvatarUpdateTrigger(prev => prev + 1)}
            onEditProfile={(type) => setEditType(type)}
            onEditGroup={(type) => setEditGroupType(type)}
            onGroupsUpdate={() => {
              setGroupsRefreshTrigger(prev => prev + 1);
              setGroupAvatarUpdateTrigger(prev => prev + 1);
            }}
            groupAvatarUpdateTrigger={groupAvatarUpdateTrigger}
          />
          <Contacts
            activeMenu={activeMenu}
            setActiveMenu={handleSetActiveMenu}     // 传下去
            setChatWith={handleSetChatWith}        // 顺便把名字带回来
            setFrom={setFrom}
          />
          <Chats
            activeMenu={activeMenu}
            setActiveMenu={handleSetActiveMenu}
            setChatWith={handleSetChatWith}
            setFrom={setFrom}
            groupsRefreshTrigger={groupsRefreshTrigger}
            onUnreadChange={(privateUnread, groupUnread) => {
              setTotalUnread(privateUnread);
              setGroupUnread(groupUnread);
            }}
          />
          <Profile
            activeMenu={activeMenu}
            setActiveMenu={handleSetActiveMenu}
            setChatWith={handleSetChatWith}
            setFrom={setFrom}
            avatarUpdateTrigger={avatarUpdateTrigger}
            editType={editType}
            onEditComplete={() => {
              setEditType(null);
              setAvatarUpdateTrigger(prev => prev + 1);
            }}
          />
          <ChatWindow
            chatWith={chatWith}
            activeMenu={activeMenu}

          />

          <ContactDetail
            setActiveMenu={handleSetActiveMenu}
            chatWith={chatWith}
            activeMenu={activeMenu}
            from={from}
          />

          <GroupsDetail
            setActiveMenu={handleSetActiveMenu}
            chatWith={chatWith}
            activeMenu={activeMenu}
            editType={editGroupType}
            onEditComplete={() => {
              setEditGroupType(null);
              setGroupsRefreshTrigger(prev => prev + 1);
            }}
            groupAvatarUpdateTrigger={groupAvatarUpdateTrigger}
            setChatWith={handleSetChatWith}
            from={from}
          />

          <Callpage
            setActiveMenu={handleSetActiveMenu}
            activeMenu={activeMenu}
            chatWith={chatWith}
          />

          <Search
            activeMenu={activeMenu}
            setActiveMenu={handleSetActiveMenu}
            setChatWith={handleSetChatWith}
          />

          <Foot
            activeMenu={activeMenu}
            setActiveMenu={handleSetActiveMenu}
            totalUnread={totalUnread + groupUnread} />
        </div>
      }
    </div>
  )
}