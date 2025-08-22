// 🧪 指纹配置快速测试脚本
// 使用方法：在浏览器控制台中执行这个脚本，会在页面右上角添加一个测试按钮

/**
 * 快速测试指纹配置功能
 * 弹出选择对话框，让用户选择要测试的账号
 */
async function quickTestFingerprint() {
    try {
        console.log('🧪 开始指纹配置测试...');
        
        // 检查是否在Electron环境
        if (!window.require) {
            alert('❌ 此功能需要在Electron应用中运行');
            return;
        }
        
        const fs = window.require('fs');
        const path = window.require('path');
        
        // 读取账号数据
        const authPath = path.join(process.cwd(), 'auth/auth.json');
        if (!fs.existsSync(authPath)) {
            alert('❌ 找不到auth.json文件');
            return;
        }
        
        const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
        
        if (!authData.accounts || authData.accounts.length === 0) {
            alert('❌ 没有找到任何账号');
            return;
        }
        
        // 筛选有指纹配置的账号
        const accountsWithFingerprint = authData.accounts.filter(acc => acc.fingerprintConfig);
        
        if (accountsWithFingerprint.length === 0) {
            alert('❌ 没有找到配置了指纹的账号\n请先在账号管理中生成指纹配置');
            return;
        }
        
        // 弹出选择对话框
        const accountNames = accountsWithFingerprint
            .map((acc, index) => `${index}: ${acc.windowName || acc.username || `账号${index + 1}`}`)
            .join('\n');
            
        const choice = prompt(`🎯 选择要测试的账号:\n\n${accountNames}\n\n请输入序号 (0-${accountsWithFingerprint.length - 1}):`);
        
        if (choice === null) {
            console.log('用户取消了操作');
            return;
        }
        
        const accountIndex = parseInt(choice);
        if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= accountsWithFingerprint.length) {
            alert('❌ 无效的账号序号');
            return;
        }
        
        const testAccount = accountsWithFingerprint[accountIndex];
        
        console.log(`🎯 开始测试账号: ${testAccount.windowName}`);
        console.log('指纹配置:', testAccount.fingerprintConfig);
        
        // 显示测试进度
        const loadingDialog = showLoadingDialog(`正在测试账号: ${testAccount.windowName}`);
        
        // 检查browserManager是否存在
        if (!window.browserManager || !window.browserManager.testFingerprintConfiguration) {
            alert('❌ 找不到browserManager或testFingerprintConfiguration方法');
            hideLoadingDialog(loadingDialog);
            return;
        }
        
        // 执行指纹测试
        const result = await window.browserManager.testFingerprintConfiguration(testAccount);
        
        hideLoadingDialog(loadingDialog);
        
        console.log('📊 测试结果:', result);
        
        if (result.success && result.validationSuccess) {
            const matchPercentage = result.results?.overall?.percentage || 0;
            const summary = result.summary || '无详细信息';
            
            // 显示成功结果
            showResultDialog(`✅ 指纹测试成功！`, `
账号: ${testAccount.windowName}
匹配度: ${matchPercentage}%

📋 详细结果:
${summary}

🔍 测试类型: ${result.testType || '完整测试'}
⏱️ 测试时间: ${new Date().toLocaleString()}
            `.trim(), 'success');
            
            // 在控制台输出详细信息
            console.log('🎉 测试成功详情:');
            console.table(result.results);
            
        } else {
            const error = result.error || '未知错误';
            showResultDialog(`❌ 指纹测试失败`, `
账号: ${testAccount.windowName}
错误: ${error}

请检查:
1. 账号指纹配置是否正确
2. 浏览器是否正常启动
3. 网络连接是否正常

🔍 调试信息:
${JSON.stringify(result, null, 2)}
            `.trim(), 'error');
            
            console.error('❌ 测试失败:', result);
        }
        
    } catch (error) {
        console.error('测试异常:', error);
        alert(`💥 测试出错: ${error.message}\n\n请查看控制台获取详细错误信息`);
    }
}

/**
 * 显示加载对话框
 */
function showLoadingDialog(message) {
    const dialog = document.createElement('div');
    dialog.id = 'fingerprint-loading-dialog';
    dialog.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 30px; border-radius: 12px; z-index: 10000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); text-align: center;
        border: 2px solid #3B82F6; min-width: 300px;
    `;
    
    dialog.innerHTML = `
        <div style="margin-bottom: 15px;">
            <div class="loading-spinner" style="
                width: 32px; height: 32px; border: 3px solid #E5E7EB;
                border-top: 3px solid #3B82F6; border-radius: 50%;
                animation: spin 1s linear infinite; margin: 0 auto;
            "></div>
        </div>
        <div style="font-size: 16px; color: #374151; font-weight: 500;">
            ${message}
        </div>
        <div style="font-size: 14px; color: #6B7280; margin-top: 8px;">
            请稍等，正在执行测试...
        </div>
    `;
    
    // 添加加载动画样式
    if (!document.getElementById('loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 添加背景遮罩
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 9999;
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
    
    return { dialog, backdrop };
}

/**
 * 隐藏加载对话框
 */
function hideLoadingDialog(elements) {
    if (elements && elements.dialog) {
        elements.dialog.remove();
    }
    if (elements && elements.backdrop) {
        elements.backdrop.remove();
    }
}

/**
 * 显示结果对话框
 */
function showResultDialog(title, content, type = 'info') {
    const colors = {
        success: { border: '#10B981', bg: '#ECFDF5', icon: '✅' },
        error: { border: '#EF4444', bg: '#FEF2F2', icon: '❌' },
        info: { border: '#3B82F6', bg: '#EFF6FF', icon: 'ℹ️' }
    };
    
    const color = colors[type] || colors.info;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 25px; border-radius: 12px; z-index: 10001;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 600px; width: 90%;
        border: 2px solid ${color.border}; max-height: 80vh; overflow-y: auto;
    `;
    
    dialog.innerHTML = `
        <div style="background: ${color.bg}; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 18px; font-weight: bold; color: #1F2937; margin-bottom: 10px;">
                ${color.icon} ${title}
            </div>
            <pre style="
                white-space: pre-wrap; font-family: 'Courier New', monospace; 
                font-size: 13px; line-height: 1.5; color: #374151; 
                background: white; padding: 15px; border-radius: 6px;
                border: 1px solid ${color.border}30; margin: 0;
            ">${content}</pre>
        </div>
        <div style="text-align: center;">
            <button onclick="this.parentElement.parentElement.remove(); document.getElementById('result-backdrop')?.remove();" 
                style="
                    background: ${color.border}; color: white; border: none; 
                    padding: 10px 25px; border-radius: 6px; cursor: pointer; 
                    font-weight: 500; font-size: 14px;
                "
            >关闭</button>
        </div>
    `;
    
    // 添加背景遮罩
    const backdrop = document.createElement('div');
    backdrop.id = 'result-backdrop';
    backdrop.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10000;
    `;
    backdrop.onclick = () => {
        dialog.remove();
        backdrop.remove();
    };
    
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
}

/**
 * 创建并添加临时测试按钮到页面
 */
function createTemporaryTestButton() {
    // 移除已存在的按钮
    const existingBtn = document.getElementById('temp-fingerprint-test-btn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    const testBtn = document.createElement('button');
    testBtn.id = 'temp-fingerprint-test-btn';
    testBtn.innerHTML = `
        <span style="margin-right: 6px;">🧪</span>
        测试指纹配置
    `;
    
    testBtn.style.cssText = `
        position: fixed; top: 15px; right: 15px; z-index: 9999;
        padding: 12px 18px; background: linear-gradient(135deg, #10B981, #059669);
        color: white; border: none; border-radius: 10px; cursor: pointer;
        font-weight: 600; font-size: 14px; font-family: 'Inter', sans-serif;
        box-shadow: 0 4px 15px rgba(16,185,129,0.4);
        transition: all 0.3s ease; user-select: none;
        backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);
    `;
    
    // 悬停效果
    testBtn.onmouseenter = function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 6px 20px rgba(16,185,129,0.5)';
    };
    
    testBtn.onmouseleave = function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(16,185,129,0.4)';
    };
    
    // 点击事件
    testBtn.onclick = quickTestFingerprint;
    
    document.body.appendChild(testBtn);
    return testBtn;
}

/**
 * 初始化脚本
 */
function initFingerprintTestUI() {
    console.log('🎯 初始化指纹配置测试UI...');
    
    try {
        const testBtn = createTemporaryTestButton();
        
        console.log('✅ 临时指纹测试按钮已添加到页面右上角！');
        console.log('📝 使用方法：');
        console.log('   1. 点击右上角的"🧪 测试指纹配置"按钮');
        console.log('   2. 在弹出的对话框中选择要测试的账号');
        console.log('   3. 等待测试完成并查看结果');
        console.log('');
        console.log('💡 提示：确保账号已经配置了指纹参数');
        
        // 添加键盘快捷键 Ctrl+T
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                quickTestFingerprint();
            }
        });
        console.log('⌨️  快捷键：Ctrl+T 也可以启动测试');
        
        return testBtn;
        
    } catch (error) {
        console.error('❌ 初始化失败:', error);
        alert(`初始化测试UI失败: ${error.message}`);
    }
}

// 自动执行初始化（如果在浏览器环境中）
if (typeof window !== 'undefined') {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFingerprintTestUI);
    } else {
        initFingerprintTestUI();
    }
}

// 导出功能供外部使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        quickTestFingerprint,
        createTemporaryTestButton,
        initFingerprintTestUI
    };
}

console.log('📄 指纹配置测试脚本已加载完成！');