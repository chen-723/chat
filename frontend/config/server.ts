// 服务器配置文件
// Docker部署时通过环境变量配置

const SERVER_CONFIG = {
  // 优先使用环境变量，否则使用默认值
  // 开发环境: http://localhost:8000
  // 生产环境: 通过 NEXT_PUBLIC_API_URL 环境变量设置
  API_BASE_URL: 'https://209.74.81.100:8000',
  // API_BASE_URL: 'https://192.168.2.38:8000',

  // WebSocket地址（自动根据API地址生成）
  get WS_BASE_URL() {
    return this.API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  }
};

export default SERVER_CONFIG;
