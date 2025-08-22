/**
 * 认证检查和权限管理脚本
 * 在主应用加载时进行许可证验证和功能权限控制
 */

class AuthChecker {
    constructor() {
        this.isAuthenticated = false;
        this.licenseData = null;
        this.permissionCache = {};
        this.statusCheckInterval = null;
        
        // 绑定方法
        this.checkLicenseStatus = this.checkLicenseStatus.bind(this);
        this.updateStatusDisplay = this.updateStatusDisplay.bind(this);
        this.enforceLicenseRestrictions = this.enforceLicenseRestrictions.bind(this);
    }

    // 初始化认证检查
    async init() {
        console.log('Auth Checker: 开始初始化...');
        
        try {
            await this.checkLicenseStatus();
            this.startPeriodicCheck();
            this.setupEventListeners();
            console.log('Auth Checker: 初始化完成');
        } catch (error) {
            console.error('Auth Checker: 初始化失败', error);
            this.handleAuthFailure('初始化失败');
        }
    }

    // 检查许可证状态
    async checkLicenseStatus() {
        try {
            // 检查许可证是否存在和有效
            const validation = await window.electronAPI.validateLicense();
            
            if (validation.valid) {
                this.isAuthenticated = true;
                this.licenseData = validation.license;
                await this.loadLicenseInfo();
                this.updateStatusDisplay('active', `剩余${validation.expiresIn}天`);
                this.enforceLicenseRestrictions(false);
                console.log('Auth Checker: 许可证验证通过');
            } else {
                this.isAuthenticated = false;
                this.licenseData = null;
                this.handleAuthFailure(validation.message || '许可证无效', validation.reason);
            }
        } catch (error) {
            console.error('Auth Checker: 检查许可证状态失败', error);
            this.handleAuthFailure('无法验证许可证');
        }
    }

    // 加载详细许可证信息
    async loadLicenseInfo() {
        try {
            const response = await window.electronAPI.getCurrentLicense();
            if (response.success && response.license) {
                this.licenseData = response.license;
                console.log('Auth Checker: 许可证信息加载成功', this.licenseData);
            }
        } catch (error) {
            console.warn('Auth Checker: 加载许可证详细信息失败', error);
        }
    }

    // 处理认证失败
    handleAuthFailure(message, reason) {
        this.isAuthenticated = false;
        this.licenseData = null;
        this.updateStatusDisplay('inactive', message);
        this.enforceLicenseRestrictions(true);
        console.warn('Auth Checker: 认证失败 -', message);
        
        // 如果是许可证过期或不存在，自动跳转到激活页面
        if (reason === 'expired' || reason === 'not_found') {
            console.log('Auth Checker: 检测到许可证过期或不存在，准备跳转到激活页面...');
            
            // 延迟3秒后跳转，给用户看到状态信息的时间
            setTimeout(() => {
                console.log('Auth Checker: 自动跳转到激活页面');
                window.location.href = 'auth-activation.html';
            }, 3000);
        }
    }

    // 更新状态显示
    updateStatusDisplay(status, message) {
        const statusElement = document.getElementById('license-status');
        const licenseBtn = document.getElementById('license-btn');
        const activateBtn = document.getElementById('activate-btn');
        
        if (!statusElement) return;

        statusElement.textContent = message;
        statusElement.className = `license-status ${status}`;

        // 根据状态显示不同的按钮
        if (status === 'active') {
            if (licenseBtn) {
                licenseBtn.style.display = 'flex';
            }
            if (activateBtn) {
                activateBtn.style.display = 'none';
            }
        } else {
            if (licenseBtn) {
                licenseBtn.style.display = 'none';
            }
            if (activateBtn) {
                activateBtn.style.display = 'flex';
            }
        }
    }

    // 执行许可证限制
    enforceLicenseRestrictions(restrict) {
        if (restrict) {
            this.disableProtectedFeatures();
            this.showUnlicensedOverlay();
        } else {
            this.enableProtectedFeatures();
            this.hideUnlicensedOverlay();
        }
    }

    // 禁用受保护的功能
    disableProtectedFeatures() {
        // 禁用主要功能按钮
        const protectedSelectors = [
            'button[onclick*="publishContent"]',
            'button[onclick*="createContent"]',
            'button[onclick*="manageAccounts"]',
            '.nav-item[onclick*="publish"]',
            '.nav-item[onclick*="content"]'
        ];

        protectedSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.disabled = true;
                element.style.opacity = '0.5';
                element.style.cursor = 'not-allowed';
                element.setAttribute('title', '需要有效许可证才能使用此功能');
            });
        });

        // 添加点击拦截
        this.addClickInterceptors();
    }

    // 启用受保护的功能
    enableProtectedFeatures() {
        const protectedSelectors = [
            'button[onclick*="publishContent"]',
            'button[onclick*="createContent"]',
            'button[onclick*="manageAccounts"]',
            '.nav-item[onclick*="publish"]',
            '.nav-item[onclick*="content"]'
        ];

        protectedSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.disabled = false;
                element.style.opacity = '1';
                element.style.cursor = 'pointer';
                element.removeAttribute('title');
            });
        });

        this.removeClickInterceptors();
    }

    // 添加点击拦截器
    addClickInterceptors() {
        document.addEventListener('click', this.clickInterceptor, true);
    }

    // 移除点击拦截器
    removeClickInterceptors() {
        document.removeEventListener('click', this.clickInterceptor, true);
    }

    // 点击拦截器函数
    clickInterceptor = (event) => {
        const target = event.target.closest('button, .nav-item');
        if (target && target.hasAttribute('title') && target.getAttribute('title').includes('需要有效许可证')) {
            event.preventDefault();
            event.stopPropagation();
            this.showLicenseRequired();
        }
    }

    // 显示未授权覆盖层
    showUnlicensedOverlay() {
        // 如果已存在覆盖层，不重复创建
        if (document.getElementById('unlicensed-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'unlicensed-overlay';
        overlay.innerHTML = `
            <div class="unlicensed-content">
                <div class="unlicensed-icon">🔒</div>
                <h3>软件未激活</h3>
                <p>请激活软件许可证以使用完整功能</p>
                <div class="unlicensed-actions">
                    <button onclick="openActivation()" class="primary-btn">立即激活</button>
                    <button onclick="showTrialInfo()" class="secondary-btn">了解更多</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    // 隐藏未授权覆盖层
    hideUnlicensedOverlay() {
        const overlay = document.getElementById('unlicensed-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // 显示许可证要求提示
    showLicenseRequired() {
        if (window.showNotification) {
            window.showNotification('需要有效许可证才能使用此功能', 'warning');
        } else {
            alert('需要有效许可证才能使用此功能\n请先激活软件');
        }
    }

    // 检查功能权限
    async checkFeaturePermission(featureName) {
        // 检查缓存
        if (this.permissionCache[featureName]) {
            return this.permissionCache[featureName];
        }

        try {
            const response = await window.electronAPI.checkFeaturePermission(featureName);
            if (response.success) {
                this.permissionCache[featureName] = response.permission;
                return response.permission;
            }
        } catch (error) {
            console.error('检查功能权限失败:', error);
        }

        return { allowed: false, reason: 'check_failed' };
    }

    // 开始定期检查
    startPeriodicCheck() {
        // 每30秒检查一次许可证状态（测试期间使用短间隔）
        this.statusCheckInterval = setInterval(async () => {
            console.log('Auth Checker: 执行定期许可证检查...');
            await this.checkLicenseStatus();
        }, 30 * 1000);
    }

    // 停止定期检查
    stopPeriodicCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 监听许可证状态变化
        window.addEventListener('license-status-changed', async (event) => {
            console.log('Auth Checker: 收到许可证状态变化事件', event.detail);
            await this.checkLicenseStatus();
        });

        // 监听页面卸载
        window.addEventListener('beforeunload', () => {
            this.stopPeriodicCheck();
        });
    }

    // 清理资源
    cleanup() {
        this.stopPeriodicCheck();
        this.removeClickInterceptors();
        this.hideUnlicensedOverlay();
    }
}

// 全局认证检查器实例
let authChecker = null;

// 初始化认证检查
async function initializeAuthChecker() {
    if (!window.electronAPI) {
        console.warn('Auth Checker: Electron API 未就绪，延迟初始化...');
        setTimeout(initializeAuthChecker, 1000);
        return;
    }

    authChecker = new AuthChecker();
    await authChecker.init();
}

// 打开激活页面
function openActivation() {
    window.location.href = 'auth-activation.html';
}

// 打开许可证管理页面
function openLicenseManager() {
    window.location.href = 'auth-status.html';
}

// 显示试用信息
function showTrialInfo() {
    const info = `
光子矩阵 - 智能创作助手

功能特性：
• AI智能内容创作
• 多账号批量管理
• 自动发布调度
• 数据分析统计

套餐选择：
• 10账号版：3000元/月
• 20账号版：5600元/月
• 50账号版：12500元/月
• 100账号版：22000元/月

联系购买：
QQ群：123456789
微信：photonmatrix2024
电话：400-123-4567
    `;
    
    alert(info);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthChecker);
} else {
    initializeAuthChecker();
}

// 导出全局方法供其他脚本使用
window.authChecker = authChecker;
window.openActivation = openActivation;
window.openLicenseManager = openLicenseManager;
window.showTrialInfo = showTrialInfo;