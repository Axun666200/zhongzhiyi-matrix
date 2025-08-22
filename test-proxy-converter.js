#!/usr/bin/env node

/**
 * 代理转换器测试脚本
 * 独立测试HTTP到SOCKS5代理转换功能
 */

const ProxyConverter = require('./proxy-converter');

// 配置信息
const config = {
  localPort: 8080,
  socksHost: '61.172.168.161',
  socksPort: 2081,
  socksUsername: 'ravu01r1',
  socksPassword: 'ravu01r1'
};

console.log('🧪 代理转换器独立测试');
console.log('='.repeat(50));
console.log('配置信息:');
console.log(`  本地HTTP代理端口: ${config.localPort}`);
console.log(`  目标SOCKS5服务器: ${config.socksHost}:${config.socksPort}`);
console.log(`  认证用户名: ${config.socksUsername}`);
console.log(`  认证密码: ${'*'.repeat(config.socksPassword.length)}`);
console.log('='.repeat(50));

async function testConverter() {
  const converter = new ProxyConverter(config);
  
  try {
    // 启动转换器
    console.log('🚀 启动代理转换器...');
    await converter.start();
    
    console.log('');
    console.log('✅ 代理转换器启动成功！');
    console.log('');
    console.log('📋 测试说明:');
    console.log('1. 转换器正在运行，监听本地端口:', config.localPort);
    console.log('2. 现在可以配置Chrome使用以下代理:');
    console.log(`   HTTP代理: 127.0.0.1:${config.localPort}`);
    console.log('3. 或者使用以下命令行参数启动Chrome:');
    console.log(`   --proxy-server=http://127.0.0.1:${config.localPort}`);
    console.log('');
    console.log('🌐 建议测试网站:');
    console.log('   - https://ipinfo.io (查看IP地址和地理位置)');
    console.log('   - https://whatismyipaddress.com');
    console.log('   - https://httpbin.org/ip');
    console.log('');
    console.log('⏹️  按 Ctrl+C 停止转换器');
    
    // 优雅关闭处理
    process.on('SIGINT', async () => {
      console.log('\n🛑 收到停止信号，正在关闭转换器...');
      try {
        await converter.stop();
        console.log('✅ 转换器已安全关闭');
        process.exit(0);
      } catch (error) {
        console.error('❌ 关闭转换器时出错:', error.message);
        process.exit(1);
      }
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 收到终止信号，正在关闭转换器...');
      try {
        await converter.stop();
        console.log('✅ 转换器已安全关闭');
        process.exit(0);
      } catch (error) {
        console.error('❌ 关闭转换器时出错:', error.message);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ 启动代理转换器失败:', error.message);
    console.error('');
    console.error('🔧 可能的解决方案:');
    console.error('1. 检查SOCKS5代理服务器是否可访问');
    console.error('2. 验证用户名和密码是否正确');
    console.error('3. 确保本地端口', config.localPort, '未被占用');
    console.error('4. 检查防火墙设置');
    process.exit(1);
  }
}

// 启动测试
testConverter();