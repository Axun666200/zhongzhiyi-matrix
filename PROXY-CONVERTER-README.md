# 🔧 代理转换器使用说明

## 📋 功能介绍

本代理转换器解决了Chrome浏览器对SOCKS5认证代理支持不完善的问题，通过在本地运行HTTP到SOCKS5的转换服务，让Chrome能够正常使用SOCKS5代理。

## 🚀 工作原理

```
Chrome浏览器 → 本地HTTP代理(127.0.0.1:8080) → SOCKS5代理(61.172.168.161:2081) → 目标网站
     ↑                    ↑                           ↑
   说HTTP语言          翻译器程序                   说SOCKS5语言
```

## 🎯 使用方法

### 方法1: 集成在主应用中（推荐）

当你运行主应用 `npm start` 时，代理转换器会自动启动：

1. **自动检测**: 当检测到SOCKS5代理时，自动启动转换器
2. **自动配置**: Chrome自动使用本地HTTP代理
3. **自动清理**: 应用退出时自动关闭转换器

### 🎯 账号管理集成（新功能）

**现在账号管理中的所有SOCKS5代理都会自动使用转换器！**

- ✅ **自动转换**: 配置SOCKS5代理的账号会自动使用HTTP代理转换器
- ✅ **智能复用**: 相同代理配置的账号共享同一个转换器实例
- ✅ **独立隔离**: 不同代理配置使用独立的转换器端口
- ✅ **无缝体验**: 无需修改账号配置，自动兼容Chrome

**使用步骤**:
1. 在账号管理中正常配置SOCKS5代理
2. 启动浏览器时自动检测并启动转换器
3. Chrome使用转换后的HTTP代理访问网站
4. 关闭浏览器时自动清理转换器资源

```bash
# 测试账号管理代理转换功能
npm run test-account-proxy
```

### 方法2: 独立测试转换器

```bash
# 测试代理转换器功能
npm run test-proxy

# 或直接运行
node test-proxy-converter.js
```

### 方法3: 手动配置Chrome

如果需要手动配置Chrome使用代理转换器：

```bash
# 启动转换器（默认端口8080）
npm run proxy-converter

# 然后启动Chrome并配置代理
chrome.exe --proxy-server=http://127.0.0.1:8080
```

## 📊 配置参数

转换器支持以下配置参数：

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| 本地端口 | LOCAL_PORT | 8080 | HTTP代理监听端口 |
| SOCKS5地址 | SOCKS_HOST | 61.172.168.161 | 目标SOCKS5服务器 |
| SOCKS5端口 | SOCKS_PORT | 2081 | 目标SOCKS5端口 |
| 用户名 | SOCKS_USERNAME | ravu01r1 | SOCKS5认证用户名 |
| 密码 | SOCKS_PASSWORD | ravu01r1 | SOCKS5认证密码 |

### 环境变量配置示例

```bash
# Windows PowerShell
$env:LOCAL_PORT="8888"
$env:SOCKS_HOST="your.proxy.server"
$env:SOCKS_PORT="1080"
$env:SOCKS_USERNAME="your_username"
$env:SOCKS_PASSWORD="your_password"
npm run test-proxy

# Linux/Mac
export LOCAL_PORT=8888
export SOCKS_HOST=your.proxy.server
export SOCKS_PORT=1080
export SOCKS_USERNAME=your_username
export SOCKS_PASSWORD=your_password
npm run test-proxy
```

## 🔍 测试验证

### 1. 启动转换器后的日志示例

```
🚀 HTTP到SOCKS5代理转换器已启动
📡 监听地址: http://127.0.0.1:8080
🎯 目标SOCKS5: 61.172.168.161:2081
🔐 认证状态: 已启用

💡 使用方法:
   Chrome代理设置: --proxy-server=http://127.0.0.1:8080
   或在Chrome设置中配置HTTP代理
```

### 2. 连接成功的日志示例

```
🔌 已连接到SOCKS5代理: 61.172.168.161:2081
✅ SOCKS5认证成功
🌐 HTTP CONNECT请求: ipinfo.io:443
✅ SOCKS5连接建立: ipinfo.io:443
✅ 隧道建立成功: ipinfo.io:443
```

### 3. 推荐测试网站

- **https://ipinfo.io** - 显示IP地址和地理位置信息
- **https://whatismyipaddress.com** - IP地址查询
- **https://httpbin.org/ip** - 简单IP显示

## ⚠️ 故障排除

### 问题1: 转换器启动失败

**错误信息**: `Error: listen EADDRINUSE`

**解决方案**:
```bash
# 检查端口占用
netstat -ano | findstr :8080

# 使用不同端口
$env:LOCAL_PORT="8888"
npm run test-proxy
```

### 问题2: SOCKS5连接失败

**错误信息**: `SOCKS5连接失败，错误码: 1`

**解决方案**:
1. 检查SOCKS5服务器地址和端口
2. 验证用户名和密码
3. 确认网络连通性

### 问题3: Chrome仍显示代理错误

**可能原因**:
1. Chrome缓存了之前的代理设置
2. 转换器未正确启动
3. 本地防火墙阻止连接

**解决方案**:
```bash
# 清除Chrome数据并重启
chrome.exe --user-data-dir=temp-profile --proxy-server=http://127.0.0.1:8080
```

## 🔧 高级配置

### 自定义转换器类

```javascript
const ProxyConverter = require('./proxy-converter');

const converter = new ProxyConverter({
  localPort: 9090,
  socksHost: 'your.proxy.com',
  socksPort: 1080,
  socksUsername: 'user',
  socksPassword: 'pass'
});

await converter.start();
```

### 错误处理和日志

转换器提供详细的连接日志，包括：
- 🔌 SOCKS5连接状态
- 🌐 HTTP请求转发
- ✅ 成功连接提示
- ❌ 错误详情和建议

## 📝 注意事项

1. **安全性**: 转换器仅监听本地回环地址(127.0.0.1)，不会暴露到网络
2. **性能**: 增加一层代理转换会有轻微的延迟影响
3. **兼容性**: 支持HTTP和HTTPS网站的代理转发
4. **清理**: 应用退出时会自动关闭转换器，释放端口

## 🎉 成功标志

当看到以下信息时，说明代理转换器工作正常：

1. ✅ 转换器启动成功
2. 🔌 SOCKS5连接建立
3. 🌐 Chrome能正常访问网站
4. 📍 IP地址显示为代理服务器的地址

现在你的Chrome浏览器应该能够正常使用SOCKS5代理了！🎉