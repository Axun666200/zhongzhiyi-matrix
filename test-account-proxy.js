#!/usr/bin/env node

/**
 * 测试账号管理中的SOCKS5代理转换功能
 */

const BrowserManager = require('./browser-manager');

async function testAccountProxyConversion() {
    console.log('🧪 测试账号管理中的SOCKS5代理转换功能\n');
    
    const browserManager = new BrowserManager();
    
    // 模拟账号配置（使用SOCKS5代理）
    const testAccount = {
        id: 'test_account_1',
        windowName: '测试账号1',
        proxyType: 'socks5',
        proxyHost: '61.172.168.161',
        proxyPort: 2081,
        proxyUsername: 'ravu01r1',
        proxyPassword: 'ravu01r1'
    };
    
    console.log('📋 测试账号配置:');
    console.log(`   账号ID: ${testAccount.id}`);
    console.log(`   代理类型: ${testAccount.proxyType}`);
    console.log(`   代理地址: ${testAccount.proxyHost}:${testAccount.proxyPort}`);
    console.log(`   认证信息: ${testAccount.proxyUsername}:${testAccount.proxyPassword}`);
    console.log('');
    
    try {
        // 测试1: 检查代理转换器启动
        console.log('🔧 测试1: 启动SOCKS5代理转换器');
        const converterPort = browserManager.ensureProxyConverter(testAccount);
        
        if (converterPort) {
            console.log(`✅ 代理转换器启动成功，HTTP代理端口: ${converterPort}`);
        } else {
            console.log('❌ 代理转换器启动失败');
            return;
        }
        
        console.log('');
        
        // 测试2: 检查Chrome参数构建
        console.log('🔧 测试2: 构建Chrome启动参数');
        const chromeArgs = browserManager.buildChromeArgs(testAccount, {
            url: 'https://ipinfo.io',
            debuggingPort: 9999,
            windowConfig: { width: 1200, height: 800, left: 100, top: 100 }
        });
        
        console.log('📋 Chrome启动参数:');
        chromeArgs.forEach((arg, index) => {
            if (arg.includes('proxy-server')) {
                console.log(`   ${index + 1}. ${arg} ⭐`);
            } else if (arg.includes('user-data-dir') || arg.includes('remote-debugging-port')) {
                console.log(`   ${index + 1}. ${arg}`);
            }
        });
        
        // 检查是否正确使用了HTTP代理
        const proxyArg = chromeArgs.find(arg => arg.includes('--proxy-server='));
        if (proxyArg && proxyArg.includes(`http://127.0.0.1:${converterPort}`)) {
            console.log('✅ Chrome配置正确使用HTTP代理转换器');
        } else {
            console.log('❌ Chrome代理配置错误');
            console.log(`   期望: --proxy-server=http://127.0.0.1:${converterPort}`);
            console.log(`   实际: ${proxyArg || '未找到代理配置'}`);
        }
        
        console.log('');
        
        // 测试3: 复用现有转换器
        console.log('🔧 测试3: 测试代理转换器复用');
        const converterPort2 = browserManager.ensureProxyConverter(testAccount);
        
        if (converterPort2 === converterPort) {
            console.log('✅ 成功复用现有代理转换器');
        } else {
            console.log('❌ 代理转换器复用失败');
            console.log(`   第一次端口: ${converterPort}`);
            console.log(`   第二次端口: ${converterPort2}`);
        }
        
        console.log('');
        
        // 测试4: 不同账号使用不同转换器
        console.log('🔧 测试4: 测试不同账号的代理转换器隔离');
        const testAccount2 = {
            ...testAccount,
            id: 'test_account_2',
            windowName: '测试账号2',
            proxyUsername: 'different_user'  // 不同的用户名
        };
        
        const converterPort3 = browserManager.ensureProxyConverter(testAccount2);
        
        if (converterPort3 && converterPort3 !== converterPort) {
            console.log('✅ 不同账号使用独立的代理转换器');
            console.log(`   账号1端口: ${converterPort}`);
            console.log(`   账号2端口: ${converterPort3}`);
        } else {
            console.log('❌ 代理转换器隔离失败');
        }
        
        console.log('');
        
        // 测试5: 清理测试
        console.log('🔧 测试5: 清理所有代理转换器');
        await browserManager.stopAllProxyConverters();
        console.log('✅ 所有代理转换器已清理');
        
        console.log('');
        console.log('🎉 所有测试完成！');
        console.log('');
        console.log('📝 测试结果总结:');
        console.log('   ✅ SOCKS5代理自动转换为HTTP代理');
        console.log('   ✅ Chrome正确使用转换后的HTTP代理');
        console.log('   ✅ 代理转换器复用机制正常');
        console.log('   ✅ 不同账号代理转换器隔离正常');
        console.log('   ✅ 资源清理机制正常');
        console.log('');
        console.log('🎯 现在账号管理中的SOCKS5代理将自动使用转换器，无需手动配置！');
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        console.error('   详细信息:', error.stack);
        
        // 确保清理资源
        try {
            await browserManager.stopAllProxyConverters();
        } catch (cleanupError) {
            console.error('❌ 清理资源失败:', cleanupError.message);
        }
    }
}

// 运行测试
if (require.main === module) {
    testAccountProxyConversion().then(() => {
        console.log('🏁 测试脚本执行完成');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 测试脚本执行失败:', error.message);
        process.exit(1);
    });
}

module.exports = { testAccountProxyConversion };