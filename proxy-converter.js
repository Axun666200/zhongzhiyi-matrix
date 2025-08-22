const http = require('http');
const net = require('net');
const url = require('url');

class ProxyConverter {
  constructor(options = {}) {
    this.localPort = options.localPort || 8080;
    this.socksHost = options.socksHost || '127.0.0.1';
    this.socksPort = options.socksPort || 1080;
    this.socksUsername = options.socksUsername || '';
    this.socksPassword = options.socksPassword || '';
    this.server = null;
  }

  // 创建SOCKS5连接
  createSocksConnection(targetHost, targetPort) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.socksPort, this.socksHost);
      
      socket.on('connect', () => {
        console.log(`🔌 已连接到SOCKS5代理: ${this.socksHost}:${this.socksPort}`);
        
        // SOCKS5握手 - 版本和认证方法
        const authMethods = this.socksUsername ? Buffer.from([0x05, 0x01, 0x02]) : Buffer.from([0x05, 0x01, 0x00]);
        socket.write(authMethods);
      });

      let step = 'handshake';
      
      socket.on('data', (data) => {
        try {
          if (step === 'handshake') {
            // 处理握手响应
            if (data[0] !== 0x05) {
              return reject(new Error('不支持的SOCKS版本'));
            }
            
            const authMethod = data[1];
            
            if (authMethod === 0x00) {
              // 无需认证，直接连接
              this.sendConnectRequest(socket, targetHost, targetPort);
              step = 'connect';
            } else if (authMethod === 0x02 && this.socksUsername) {
              // 需要用户名密码认证
              const authData = Buffer.concat([
                Buffer.from([0x01]), // 认证版本
                Buffer.from([this.socksUsername.length]), // 用户名长度
                Buffer.from(this.socksUsername), // 用户名
                Buffer.from([this.socksPassword.length]), // 密码长度
                Buffer.from(this.socksPassword) // 密码
              ]);
              socket.write(authData);
              step = 'auth';
            } else {
              return reject(new Error('不支持的认证方法'));
            }
          } else if (step === 'auth') {
            // 处理认证响应
            if (data[0] !== 0x01 || data[1] !== 0x00) {
              return reject(new Error('SOCKS5认证失败'));
            }
            console.log('✅ SOCKS5认证成功');
            this.sendConnectRequest(socket, targetHost, targetPort);
            step = 'connect';
          } else if (step === 'connect') {
            // 处理连接响应
            if (data[0] !== 0x05 || data[1] !== 0x00) {
              return reject(new Error(`SOCKS5连接失败，错误码: ${data[1]}`));
            }
            console.log(`✅ SOCKS5连接建立: ${targetHost}:${targetPort}`);
            resolve(socket);
          }
        } catch (error) {
          reject(error);
        }
      });

      socket.on('error', (error) => {
        console.error('❌ SOCKS5连接错误:', error.message);
        reject(error);
      });

      socket.on('close', () => {
        console.log('🔌 SOCKS5连接已关闭');
      });
    });
  }

  // 发送SOCKS5连接请求
  sendConnectRequest(socket, targetHost, targetPort) {
    const hostBuffer = Buffer.from(targetHost);
    const connectRequest = Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03]), // SOCKS5, CONNECT, 保留字节, 域名类型
      Buffer.from([hostBuffer.length]), // 域名长度
      hostBuffer, // 域名
      Buffer.from([(targetPort >> 8) & 0xFF, targetPort & 0xFF]) // 端口（大端序）
    ]);
    socket.write(connectRequest);
  }

  // 处理HTTP CONNECT请求
  handleConnect(req, clientSocket, head) {
    const { hostname, port } = url.parse(`http://${req.url}`);
    const targetPort = parseInt(port) || (req.url.includes(':443') ? 443 : 80);
    
    console.log(`🌐 HTTP CONNECT请求: ${hostname}:${targetPort}`);

    this.createSocksConnection(hostname, targetPort)
      .then((socksSocket) => {
        // 向客户端发送连接成功响应
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        
        // 如果有预读数据，先写入
        if (head && head.length > 0) {
          socksSocket.write(head);
        }

        // 双向数据转发
        clientSocket.pipe(socksSocket);
        socksSocket.pipe(clientSocket);

        // 错误处理
        clientSocket.on('error', (err) => {
          console.error('❌ 客户端连接错误:', err.message);
          socksSocket.destroy();
        });

        socksSocket.on('error', (err) => {
          console.error('❌ SOCKS代理连接错误:', err.message);
          clientSocket.destroy();
        });

        console.log(`✅ 隧道建立成功: ${hostname}:${targetPort}`);
      })
      .catch((error) => {
        console.error('❌ 建立SOCKS连接失败:', error.message);
        clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        clientSocket.end();
      });
  }

  // 处理HTTP GET/POST请求
  handleHttpRequest(req, res) {
    const targetUrl = req.url;
    const parsedUrl = url.parse(targetUrl);
    const hostname = parsedUrl.hostname;
    const port = parseInt(parsedUrl.port) || 80;
    
    console.log(`🌐 HTTP请求: ${req.method} ${targetUrl}`);

    this.createSocksConnection(hostname, port)
      .then((socksSocket) => {
        // 构建HTTP请求
        const requestLine = `${req.method} ${parsedUrl.path || '/'} HTTP/1.1\r\n`;
        const headers = Object.keys(req.headers)
          .map(key => `${key}: ${req.headers[key]}`)
          .join('\r\n');
        const httpRequest = requestLine + headers + '\r\n\r\n';

        // 发送HTTP请求到目标服务器
        socksSocket.write(httpRequest);

        // 转发请求体（如果有）
        req.pipe(socksSocket);

        // 转发响应
        socksSocket.pipe(res);

        // 错误处理
        socksSocket.on('error', (err) => {
          console.error('❌ SOCKS代理连接错误:', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway');
          }
        });

        console.log(`✅ HTTP请求转发成功: ${hostname}:${port}`);
      })
      .catch((error) => {
        console.error('❌ 建立SOCKS连接失败:', error.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Bad Gateway');
        }
      });
  }

  // 启动代理服务器
  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer();

      // 处理HTTP请求
      this.server.on('request', (req, res) => {
        this.handleHttpRequest(req, res);
      });

      // 处理HTTPS CONNECT请求
      this.server.on('connect', (req, clientSocket, head) => {
        this.handleConnect(req, clientSocket, head);
      });

      // 错误处理
      this.server.on('error', (error) => {
        console.error('❌ 代理服务器错误:', error.message);
        reject(error);
      });

      // 启动服务器
      this.server.listen(this.localPort, '127.0.0.1', () => {
        console.log(`🚀 HTTP到SOCKS5代理转换器已启动`);
        console.log(`📡 监听地址: http://127.0.0.1:${this.localPort}`);
        console.log(`🎯 目标SOCKS5: ${this.socksHost}:${this.socksPort}`);
        console.log(`🔐 认证状态: ${this.socksUsername ? '已启用' : '无需认证'}`);
        console.log('');
        console.log('💡 使用方法:');
        console.log(`   Chrome代理设置: --proxy-server=http://127.0.0.1:${this.localPort}`);
        console.log('   或在Chrome设置中配置HTTP代理');
        resolve();
      });
    });
  }

  // 同步启动代理服务器（用于BrowserManager中的同步调用）
  startSync() {
    this.server = http.createServer();

    // 处理HTTP请求
    this.server.on('request', (req, res) => {
      this.handleHttpRequest(req, res);
    });

    // 处理HTTPS CONNECT请求
    this.server.on('connect', (req, clientSocket, head) => {
      this.handleConnect(req, clientSocket, head);
    });

    // 错误处理
    this.server.on('error', (error) => {
      console.error('❌ 代理服务器错误:', error.message);
      throw error;
    });

    // 同步启动服务器
    this.server.listen(this.localPort, '127.0.0.1');
    
    console.log(`🚀 HTTP到SOCKS5代理转换器已启动`);
    console.log(`📡 监听地址: http://127.0.0.1:${this.localPort}`);
    console.log(`🎯 目标SOCKS5: ${this.socksHost}:${this.socksPort}`);
    console.log(`🔐 认证状态: ${this.socksUsername ? '已启用' : '无需认证'}`);
    
    return this.localPort;
  }

  // 停止代理服务器
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 代理转换器已停止');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// 如果直接运行此文件
if (require.main === module) {
  // 从命令行参数或环境变量获取配置
  const config = {
    localPort: parseInt(process.env.LOCAL_PORT) || 8080,
    socksHost: process.env.SOCKS_HOST || '61.172.168.161',
    socksPort: parseInt(process.env.SOCKS_PORT) || 2081,
    socksUsername: process.env.SOCKS_USERNAME || 'ravu01r1',
    socksPassword: process.env.SOCKS_PASSWORD || 'ravu01r1'
  };

  console.log('🔧 代理转换器配置:');
  console.log('   本地端口:', config.localPort);
  console.log('   SOCKS5地址:', `${config.socksHost}:${config.socksPort}`);
  console.log('   认证用户:', config.socksUsername ? '***' : '无');
  console.log('');

  const converter = new ProxyConverter(config);
  
  converter.start().catch((error) => {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n🛑 收到停止信号...');
    converter.stop().then(() => {
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 收到终止信号...');
    converter.stop().then(() => {
      process.exit(0);
    });
  });
}

module.exports = ProxyConverter;