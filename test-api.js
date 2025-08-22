// ElectronAPI 测试脚本
console.log('🔍 开始测试 ElectronAPI 功能...');

// 等待API就绪
async function waitForAPI() {
    return new Promise((resolve) => {
        const checkAPI = () => {
            if (window.electronAPI) {
                console.log('✅ ElectronAPI 已就绪');
                resolve(true);
            } else {
                console.log('⏳ 等待 ElectronAPI...');
                setTimeout(checkAPI, 100);
            }
        };
        checkAPI();
    });
}

// 测试Shell API
async function testShellAPI() {
    console.log('\n🌐 测试 Shell API...');
    
    try {
        // 测试 openExternal
        if (window.electronAPI.openExternal) {
            console.log('✓ openExternal 方法存在');
        } else {
            console.log('✗ openExternal 方法不存在');
        }
        
        // 测试 openPath
        if (window.electronAPI.openPath) {
            console.log('✓ openPath 方法存在');
        } else {
            console.log('✗ openPath 方法不存在');
        }
        
        // 测试 trashItem
        if (window.electronAPI.trashItem) {
            console.log('✓ trashItem 方法存在');
        } else {
            console.log('✗ trashItem 方法不存在');
        }
        
        // 测试 showItemInFolder
        if (window.electronAPI.showItemInFolder) {
            console.log('✓ showItemInFolder 方法存在');
        } else {
            console.log('✗ showItemInFolder 方法不存在');
        }
        
    } catch (error) {
        console.error('❌ Shell API 测试失败:', error);
    }
}

// 测试剪贴板API
async function testClipboardAPI() {
    console.log('\n📋 测试 Clipboard API...');
    
    try {
        // 测试 writeText
        if (window.electronAPI.writeText) {
            console.log('✓ writeText 方法存在');
            const result = await window.electronAPI.writeText('测试文本 - ElectronAPI');
            console.log('  写入测试:', result.success ? '成功' : '失败');
        } else {
            console.log('✗ writeText 方法不存在');
        }
        
        // 测试 readText
        if (window.electronAPI.readText) {
            console.log('✓ readText 方法存在');
            const result = await window.electronAPI.readText();
            console.log('  读取测试:', result.success ? `成功 - "${result.text}"` : '失败');
        } else {
            console.log('✗ readText 方法不存在');
        }
        
    } catch (error) {
        console.error('❌ Clipboard API 测试失败:', error);
    }
}

// 测试对话框API
async function testDialogAPI() {
    console.log('\n💬 测试 Dialog API...');
    
    try {
        // 测试 showMessageBox
        if (window.electronAPI.showMessageBox) {
            console.log('✓ showMessageBox 方法存在');
        } else {
            console.log('✗ showMessageBox 方法不存在');
        }
        
        // 测试 showErrorBox
        if (window.electronAPI.showErrorBox) {
            console.log('✓ showErrorBox 方法存在');
        } else {
            console.log('✗ showErrorBox 方法不存在');
        }
        
        // 测试 showOpenDialog
        if (window.electronAPI.showOpenDialog) {
            console.log('✓ showOpenDialog 方法存在');
        } else {
            console.log('✗ showOpenDialog 方法不存在');
        }
        
        // 测试 showSaveDialog
        if (window.electronAPI.showSaveDialog) {
            console.log('✓ showSaveDialog 方法存在');
        } else {
            console.log('✗ showSaveDialog 方法不存在');
        }
        
    } catch (error) {
        console.error('❌ Dialog API 测试失败:', error);
    }
}

// 测试应用信息API
async function testAppInfoAPI() {
    console.log('\n📱 测试 App Info API...');
    
    try {
        // 测试 getAppVersion
        if (window.electronAPI.getAppVersion) {
            console.log('✓ getAppVersion 方法存在');
            const result = await window.electronAPI.getAppVersion();
            console.log('  版本:', result.success ? result.version : '获取失败');
        } else {
            console.log('✗ getAppVersion 方法不存在');
        }
        
        // 测试 getAppName
        if (window.electronAPI.getAppName) {
            console.log('✓ getAppName 方法存在');
            const result = await window.electronAPI.getAppName();
            console.log('  名称:', result.success ? result.name : '获取失败');
        } else {
            console.log('✗ getAppName 方法不存在');
        }
        
    } catch (error) {
        console.error('❌ App Info API 测试失败:', error);
    }
}

// 测试窗口控制API
async function testWindowAPI() {
    console.log('\n🪟 测试 Window API...');
    
    try {
        // 测试 minimizeWindow
        if (window.electronAPI.minimizeWindow) {
            console.log('✓ minimizeWindow 方法存在');
        } else {
            console.log('✗ minimizeWindow 方法不存在');
        }
        
        // 测试 maximizeWindow
        if (window.electronAPI.maximizeWindow) {
            console.log('✓ maximizeWindow 方法存在');
        } else {
            console.log('✗ maximizeWindow 方法不存在');
        }
        
        // 测试 isMaximized
        if (window.electronAPI.isMaximized) {
            console.log('✓ isMaximized 方法存在');
            const result = await window.electronAPI.isMaximized();
            console.log('  窗口状态:', result.success ? (result.isMaximized ? '已最大化' : '未最大化') : '获取失败');
        } else {
            console.log('✗ isMaximized 方法不存在');
        }
        
    } catch (error) {
        console.error('❌ Window API 测试失败:', error);
    }
}

// 测试工具函数
async function testUtilityFunctions() {
    console.log('\n🔧 测试工具函数...');
    
    const utilityFunctions = [
        'openInBrowser', 'openFolder', 'showInFolder', 'deleteToTrash',
        'copyToClipboard', 'pasteFromClipboard', 'showConfirmDialog',
        'showInfoDialog', 'showErrorDialog', 'getAppInfo',
        'minimizeApp', 'maximizeApp', 'selectFile', 'selectFolder'
    ];
    
    let availableCount = 0;
    
    utilityFunctions.forEach(funcName => {
        if (window[funcName]) {
            console.log(`✓ ${funcName} 函数可用`);
            availableCount++;
        } else {
            console.log(`✗ ${funcName} 函数不可用`);
        }
    });
    
    console.log(`\n📊 工具函数统计: ${availableCount}/${utilityFunctions.length} 可用`);
}

// 运行完整测试
async function runFullTest() {
    console.log('🚀 ElectronAPI 完整测试开始\n');
    console.log('='.repeat(50));
    
    await waitForAPI();
    
    await testShellAPI();
    await testClipboardAPI();
    await testDialogAPI();
    await testAppInfoAPI();
    await testWindowAPI();
    await testUtilityFunctions();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 测试完成！');
    
    // 显示测试完成通知 - 已禁用
    // if (window.showInfoDialog) {
    //     await window.showInfoDialog('测试完成', 'ElectronAPI 功能测试已完成！\n请查看控制台输出了解详细结果。');
    // }
}

// 页面加载完成后自动运行测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFullTest);
} else {
    runFullTest();
}

// 导出测试函数供手动调用
window.testElectronAPI = {
    runFullTest,
    testShellAPI,
    testClipboardAPI,
    testDialogAPI,
    testAppInfoAPI,
    testWindowAPI,
    testUtilityFunctions
};

console.log('📋 测试脚本已加载，可以手动调用 window.testElectronAPI.runFullTest() 来运行测试');