// 服务器配置文件
// 部署时只需修改这个文件即可

const SERVER_CONFIG = {
  // 开发环境使用 localhost
  // 生产环境改为服务器IP，例如: 'http://192.168.2.19:8000'
  // API_BASE_URL: 'https://localhost:8000',
  API_BASE_URL: 'https://209.74.81.100:8000',
  
  // WebSocket地址（自动根据API地址生成）
  get WS_BASE_URL() {
    return this.API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  }
};

export default SERVER_CONFIG;
