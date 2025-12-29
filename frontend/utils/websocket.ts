// WebSocket工具类
import SERVER_CONFIG from '@/config/server';

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private isManualClose: boolean = false;

  constructor() { }

  // 连接WebSocket
  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接');
      return;
    }

    this.token = token;
    // 使用统一配置
    this.url = `${SERVER_CONFIG.WS_BASE_URL}/ws?token=${token}`;
    this.isManualClose = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = async () => {
        console.log('WebSocket连接成功');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // 连接成功后设置在线状态
        try {
          const { setOnlineStatus } = await import('@/utils/api/auth');
          await setOnlineStatus(this.token, 'online');
          console.log('已设置在线状态');
        } catch (error) {
          console.error('设置在线状态失败:', error);
        }
      };

      this.ws.onmessage = (event) => {
        // 处理二进制消息（音频流）
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          const audioHandlers = this.messageHandlers.get('audio_data');
          if (audioHandlers) {
            audioHandlers.forEach(handler => handler(event.data));
          }
          return;
        }

        // 处理文本消息（JSON）
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('解析消息失败:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
      };

      this.ws.onclose = async () => {
        console.log('WebSocket连接关闭');
        this.stopHeartbeat();

        // 连接关闭时设置离线状态
        try {
          const { setOnlineStatus } = await import('@/utils/api/auth');
          await setOnlineStatus(this.token, 'offline');
          console.log('已设置离线状态');
        } catch (error) {
          console.error('设置离线状态失败:', error);
        }

        if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };
    } catch (e) {
      console.error('WebSocket连接失败:', e);
    }
  }

  // 重连
  private reconnect() {
    this.reconnectAttempts++;
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(this.token);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  // 心跳检测
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: Date.now()
        });
      }
    }, 30000); // 每30秒发送一次心跳
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 发送消息
  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  }

  // 发送二进制数据（用于音频流）
  sendBinary(data: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('WebSocket未连接，无法发送二进制数据');
    }
  }

  // 处理接收到的消息
  private handleMessage(message: { type: string; data: any }) {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message.data));
    }

    // 触发全局未读数更新（任何消息都会触发）
    const unreadHandlers = this.messageHandlers.get('unread_update');
    if (unreadHandlers) {
      unreadHandlers.forEach(handler => handler(null));
    }
  }

  // 注册消息处理器
  on(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  // 移除消息处理器
  off(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // 关闭连接
  close() {
    this.isManualClose = true;
    this.stopHeartbeat();

    // 关闭前设置离线状态
    if (this.token) {
      import('@/utils/api/auth').then(({ setOnlineStatus }) => {
        setOnlineStatus(this.token, 'offline').catch(error => {
          console.error('设置离线状态失败:', error);
        });
      });
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // 获取连接状态
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // 手动触发事件（用于本地操作后需要刷新的场景）
  trigger(type: string, data?: any) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

// 导出单例
export const wsClient = new WebSocketClient();
