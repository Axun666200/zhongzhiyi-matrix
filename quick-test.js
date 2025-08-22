// 快速API测试脚本 - 在Electron应用的控制台中运行
console.log('🚀 开始ElectronAPI快速测试...');

async function quickTest() {
    const results = [];
    
    // 1. 检查API可用性
    console.log('1️⃣ 检查API可用性...');
    const apiAvailable = !!window.electronAPI;
    results.push({test: 'ElectronAPI可用性', result: apiAvailable, details: apiAvailable ? 'API对象存在' : 'API对象不存在'});
    
    if (!apiAvailable) {
        console.error('❌ ElectronAPI不可用，测试终止');
        return results;
    }
    
    // 2. 检查新增的Shell API方法
    console.log('2️⃣ 检查Shell API方法...');
    const shellMethods = ['openExternal', 'openPath', 'trashItem', 'showItemInFolder'];
    shellMethods.forEach(method => {
        const available = !!window.electronAPI[method];
        results.push({test: `Shell.${method}`, result: available, details: available ? '方法存在' : '方法不存在'});
    });
    
    // 3. 检查剪贴板API方法
    console.log('3️⃣ 检查剪贴板API方法...');
    const clipboardMethods = ['writeText', 'readText', 'writeImage', 'readImage'];
    clipboardMethods.forEach(method => {
        const available = !!window.electronAPI[method];
        results.push({test: `Clipboard.${method}`, result: available, details: available ? '方法存在' : '方法不存在'});
    });
    
    // 4. 检查对话框API方法
    console.log('4️⃣ 检查对话框API方法...');
    const dialogMethods = ['showSaveDialog', 'showMessageBox', 'showErrorBox'];
    dialogMethods.forEach(method => {
        const available = !!window.electronAPI[method];
        results.push({test: `Dialog.${method}`, result: available, details: available ? '方法存在' : '方法不存在'});
    });
    
    // 5. 检查应用信息API方法
    console.log('5️⃣ 检查应用信息API方法...');
    const appMethods = ['getAppVersion', 'getAppName'];
    appMethods.forEach(method => {
        const available = !!window.electronAPI[method];
        results.push({test: `App.${method}`, result: available, details: available ? '方法存在' : '方法不存在'});
    });
    
    // 6. 检查窗口控制API方法
    console.log('6️⃣ 检查窗口控制API方法...');
    const windowMethods = ['minimizeWindow', 'maximizeWindow', 'closeWindow', 'isMaximized'];
    windowMethods.forEach(method => {
        const available = !!window.electronAPI[method];
        results.push({test: `Window.${method}`, result: available, details: available ? '方法存在' : '方法不存在'});
    });
    
    // 7. 检查工具函数
    console.log('7️⃣ 检查工具函数...');
    const utilityFunctions = [
        'openInBrowser', 'openFolder', 'showInFolder', 'deleteToTrash',
        'copyToClipboard', 'pasteFromClipboard', 'showConfirmDialog',
        'showInfoDialog', 'showErrorDialog', 'getAppInfo',
        'minimizeApp', 'maximizeApp', 'selectFile', 'selectFolder'
    ];
    utilityFunctions.forEach(func => {
        const available = typeof window[func] === 'function';
        results.push({test: `Utility.${func}`, result: available, details: available ? '函数可用' : '函数不存在'});
    });
    
    // 8. 实际功能测试（安全的测试）
    console.log('8️⃣ 执行实际功能测试...');
    
    try {
        // 测试剪贴板写入和读取
        if (window.electronAPI.writeText && window.electronAPI.readText) {
            const testText = 'ElectronAPI测试 - ' + Date.now();
            const writeResult = await window.electronAPI.writeText(testText);
            if (writeResult.success) {
                const readResult = await window.electronAPI.readText();
                const clipboardWorks = readResult.success && readResult.text === testText;
                results.push({test: '剪贴板读写功能', result: clipboardWorks, details: clipboardWorks ? '读写成功' : '读写失败'});
            } else {
                results.push({test: '剪贴板读写功能', result: false, details: '写入失败'});
            }
        }
    } catch (error) {
        results.push({test: '剪贴板读写功能', result: false, details: '测试异常: ' + error.message});
    }
    
    try {
        // 测试应用信息获取
        if (window.electronAPI.getAppVersion && window.electronAPI.getAppName) {
            const [versionResult, nameResult] = await Promise.all([
                window.electronAPI.getAppVersion(),
                window.electronAPI.getAppName()
            ]);
            
            const appInfoWorks = versionResult.success && nameResult.success;
            results.push({
                test: '应用信息获取', 
                result: appInfoWorks, 
                details: appInfoWorks ? `${nameResult.name} v${versionResult.version}` : '获取失败'
            });
        }
    } catch (error) {
        results.push({test: '应用信息获取', result: false, details: '测试异常: ' + error.message});
    }
    
    try {
        // 测试窗口状态查询
        if (window.electronAPI.isMaximized) {
            const result = await window.electronAPI.isMaximized();
            const statusWorks = result.success;
            results.push({
                test: '窗口状态查询', 
                result: statusWorks, 
                details: statusWorks ? `窗口${result.isMaximized ? '已最大化' : '未最大化'}` : '查询失败'
            });
        }
    } catch (error) {
        results.push({test: '窗口状态查询', result: false, details: '测试异常: ' + error.message});
    }
    
    // 9. 生成测试报告
    console.log('9️⃣ 生成测试报告...');
    const totalTests = results.length;
    const passedTests = results.filter(r => r.result).length;
    const failedTests = totalTests - passedTests;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ElectronAPI 快速测试报告');
    console.log('='.repeat(60));
    console.log(`📈 总计: ${totalTests} 项测试`);
    console.log(`✅ 通过: ${passedTests} 项`);
    console.log(`❌ 失败: ${failedTests} 项`);
    console.log(`📊 通过率: ${passRate}%`);
    console.log('='.repeat(60));
    
    // 显示详细结果
    console.log('\n📋 详细测试结果:');
    results.forEach((result, index) => {
        const status = result.result ? '✅' : '❌';
        console.log(`${index + 1}. ${status} ${result.test} - ${result.details}`);
    });
    
    // 如果有失败的测试，显示建议
    if (failedTests > 0) {
        console.log('\n💡 建议:');
        const failedResults = results.filter(r => !r.result);
        failedResults.forEach(result => {
            if (result.details.includes('方法不存在') || result.details.includes('函数不存在')) {
                console.log(`- 检查 ${result.test} 是否正确实现和导出`);
            }
        });
    }
    
    console.log('\n🎉 快速测试完成！');
    
    // 如果showInfoDialog可用，显示结果通知 - 已禁用
    // if (window.showInfoDialog) {
    //     await window.showInfoDialog(
    //         '测试完成', 
    //         `ElectronAPI快速测试完成！\n\n通过率: ${passRate}%\n通过: ${passedTests}/${totalTests}\n\n详细结果请查看控制台。`
    //     );
    // }
    
    return results;
}

// 导出测试函数
window.quickAPITest = quickTest;

// 如果在Electron环境中，自动运行测试
if (window.electronAPI) {
    console.log('🔍 检测到ElectronAPI，准备运行快速测试...');
    console.log('💡 手动运行测试: quickAPITest()');
    
    // 延迟执行，确保所有API都已加载
    setTimeout(() => {
        quickTest().then(results => {
            console.log('✅ 快速测试自动执行完成');
        }).catch(error => {
            console.error('❌ 快速测试执行失败:', error);
        });
    }, 1000);
} else {
    console.log('⚠️ 未检测到ElectronAPI，请在Electron应用中运行此测试');
    console.log('💡 手动运行测试: quickAPITest()');
}