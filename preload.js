const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
    // 浏览器管理相关API
    launchBrowser: (account, url, options) => 
        ipcRenderer.invoke('launch-browser', account, url, options),
    
    closeBrowser: (accountId) => 
        ipcRenderer.invoke('close-browser', accountId),
    
    getRunningBrowsers: () => 
        ipcRenderer.invoke('get-running-browsers'),
    
    isBrowserRunning: (accountId) => 
        ipcRenderer.invoke('is-browser-running', accountId),
    
    closeAllBrowsers: () => 
        ipcRenderer.invoke('close-all-browsers'),

    // 导航至指定URL（在已打开的浏览器窗口中）
    navigateToUrl: (accountId, url) =>
        ipcRenderer.invoke('navigate-to-url', accountId, url),

    // 采集小红书通知（通过CDP）
    collectXhsNotifications: (accountId) =>
        ipcRenderer.invoke('collect-xhs-notifications', accountId),
    
    // 在通知页执行回复
    replyToXhsComment: (accountId, target) =>
        ipcRenderer.invoke('reply-to-xhs-comment', accountId, target),
    
    // 发布小红书内容
    publishXhsContent: (accountId, content) =>
        ipcRenderer.invoke('publish-xhs-content', accountId, content),
    
    // 执行浏览器脚本
    executeScript: (accountId, script, options) => 
        ipcRenderer.invoke('execute-script', accountId, script, options),
    
    // Chrome配置相关API
    getChromePath: () => 
        ipcRenderer.invoke('get-chrome-path'),
    
    setChromePath: (chromePath) => 
        ipcRenderer.invoke('set-chrome-path', chromePath),
    
    // 用户数据管理
    cleanupUserData: (accountId) => 
        ipcRenderer.invoke('cleanup-user-data', accountId),
    
    // 系统信息
    getPlatform: () => process.platform,
    
    // 文件系统相关
    showOpenDialog: (options) => 
        ipcRenderer.invoke('show-open-dialog', options),
    
    showSaveDialog: (options) => 
        ipcRenderer.invoke('show-save-dialog', options),
    
    // 对话框相关
    showMessageBox: (options) => 
        ipcRenderer.invoke('show-message-box', options),
    
    showErrorBox: (title, content) => 
        ipcRenderer.invoke('show-error-box', title, content),
    
    // Shell相关API
    openExternal: (url) => 
        ipcRenderer.invoke('shell-open-external', url),
    
    openPath: (path) => 
        ipcRenderer.invoke('shell-open-path', path),
    
    trashItem: (path) => 
        ipcRenderer.invoke('shell-trash-item', path),
    
    showItemInFolder: (fullPath) => 
        ipcRenderer.invoke('shell-show-item-in-folder', fullPath),
    
    // 剪贴板相关
    writeText: (text) => 
        ipcRenderer.invoke('clipboard-write-text', text),
    
    readText: () => 
        ipcRenderer.invoke('clipboard-read-text'),
    
    writeImage: (image) => 
        ipcRenderer.invoke('clipboard-write-image', image),
    
    readImage: () => 
        ipcRenderer.invoke('clipboard-read-image'),
    
    // 应用信息相关
    getAppVersion: () => 
        ipcRenderer.invoke('get-app-version'),
    
    getAppName: () => 
        ipcRenderer.invoke('get-app-name'),
    
    // 窗口控制相关
    minimizeWindow: () => 
        ipcRenderer.invoke('minimize-window'),
    
    maximizeWindow: () => 
        ipcRenderer.invoke('maximize-window'),
    
    closeWindow: () => 
        ipcRenderer.invoke('close-window'),
    
    isMaximized: () => 
        ipcRenderer.invoke('is-maximized'),
    
    // 发布管理相关API
    publishViaSelenium: (payload) => 
        ipcRenderer.invoke('publish-via-selenium', payload),
    
    // 认证系统相关API
    activateCardKey: (cardKey) =>
        ipcRenderer.invoke('activate-card-key', cardKey),
    
    validateLicense: () =>
        ipcRenderer.invoke('validate-license'),
    
    getLicenseStatus: () =>
        ipcRenderer.invoke('get-license-status'),
    
    checkFeaturePermission: (featureName) =>
        ipcRenderer.invoke('check-feature-permission', featureName),
    
    getCurrentLicense: () =>
        ipcRenderer.invoke('get-current-license'),
    
    removeLicense: () =>
        ipcRenderer.invoke('remove-license'),
    
    getDeviceInfo: () =>
        ipcRenderer.invoke('get-device-info'),
    
    // 管理员功能 (卡密生成等)
    generateCardKeys: (config) =>
        ipcRenderer.invoke('generate-card-keys', config),
    
    getCardDetails: (cardKey) =>
        ipcRenderer.invoke('get-card-details', cardKey),
    
    getUsageStatistics: (agentId) =>
        ipcRenderer.invoke('get-usage-statistics', agentId),
    
    exportCards: (filter) =>
        ipcRenderer.invoke('export-cards', filter),
    
    // 代理连接测试
    testProxy: (proxyConfig) =>
        ipcRenderer.invoke('test-proxy', proxyConfig)
});

// 监听主进程事件
ipcRenderer.on('browser-process-exit', (event, data) => {
    window.dispatchEvent(new CustomEvent('browser-process-exit', { detail: data }));
});

ipcRenderer.on('browser-process-error', (event, data) => {
    window.dispatchEvent(new CustomEvent('browser-process-error', { detail: data }));
});