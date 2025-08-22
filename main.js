const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const BrowserManager = require('./browser-manager');
const LicenseManager = require('./auth/license-manager');
const CardGenerator = require('./auth/card-generator');
const DeviceFingerprint = require('./auth/device-fingerprint');
const ProxyConverter = require('./proxy-converter');


const browserManager = new BrowserManager();
const licenseManager = new LicenseManager();
const cardGenerator = new CardGenerator();
const deviceFingerprint = new DeviceFingerprint();

// 全局代理转换器实例
let proxyConverter = null;



let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'images/2.png'),
    titleBarStyle: 'default',
    show: false,
    // 为高DPI显示器优化图标显示
    enableLargerThanScreen: true
  });

  // 加载应用的index.html
  mainWindow.loadFile('index.html');

  // 当窗口准备好显示时再显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // IPC 在全局初始化一次，这里不再重复注册
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(async () => {
  // 先初始化许可证管理器
  try {
    await licenseManager.init();
    console.log('许可证管理器初始化完成');
  } catch (error) {
    console.error('许可证管理器初始化失败:', error);
  }
  
  // 然后创建窗口
  createWindow();
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 设置应用菜单
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

// 构建视图菜单项
const viewSubmenu = [
  { role: 'reload', label: '重新加载' },
  { role: 'forceReload', label: '强制重新加载' }
];

// 只在开发环境或调试模式下显示开发者工具
if (isDevelopment) {
  viewSubmenu.push({ role: 'toggleDevTools', label: '开发者工具' });
}

viewSubmenu.push(
  { type: 'separator' },
  { role: 'resetZoom', label: '实际大小' },
  { role: 'zoomIn', label: '放大' },
  { role: 'zoomOut', label: '缩小' },
  { type: 'separator' },
  { role: 'togglefullscreen', label: '全屏' }
);

const template = [
  {
    label: '文件',
    submenu: [
      { role: 'quit', label: '退出' }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { role: 'undo', label: '撤销' },
      { role: 'redo', label: '重做' },
      { type: 'separator' },
      { role: 'cut', label: '剪切' },
      { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' }
    ]
  },
  {
    label: '视图',
    submenu: viewSubmenu
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '关于',
        click: () => {
          require('electron').dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: '关于众之翼矩阵',
            message: '众之翼矩阵 v1.0.4',
            detail: '专为AI智能化自动化而生的桌面应用程序'
          });
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// 全局只注册一次 IPC，避免渲染进程过早调用导致未注册，以及多次注册导致冲突
setupIPC();

// 设置IPC通信处理
function setupIPC() {
  // 启动浏览器
  ipcMain.handle('launch-browser', async (event, account, url, options = {}) => {
    try {
      const result = await browserManager.launchBrowser(account, url, options);
      return result;
    } catch (error) {
      console.error('IPC - 启动浏览器失败:', error);
      return { success: false, error: error.message };
    }
  });

    // 在已运行浏览器中导航到指定URL
    ipcMain.handle('navigate-to-url', async (event, accountId, url) => {
      try {
        const result = await browserManager.navigateToUrl(accountId, url);
        return result;
      } catch (error) {
        console.error('IPC - 导航到URL失败:', error);
        return { success: false, error: error.message };
      }
    });

  // 收集小红书通知（红点与评论）
  ipcMain.handle('collect-xhs-notifications', async (event, accountId, options = {}) => {
    try {
      const result = await browserManager.collectXhsNotifications(accountId, options);
      return result;
    } catch (error) {
      console.error('IPC - 收集小红书通知失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 在通知页执行回复
  ipcMain.handle('reply-to-xhs-comment', async (event, accountId, target) => {
    try {
      const result = await browserManager.replyToXhsComment(accountId, target);
      return result;
    } catch (error) {
      console.error('IPC - 回复评论失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 发布小红书内容
  ipcMain.handle('publish-xhs-content', async (event, accountId, content) => {
    try {
      const result = await browserManager.publishXhsContent(accountId, content);
      return result;
    } catch (error) {
      console.error('IPC - 发布内容失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 关闭浏览器
  ipcMain.handle('close-browser', async (event, accountId) => {
    try {
      const result = await browserManager.closeBrowser(accountId);
      return result;
    } catch (error) {
      console.error('IPC - 关闭浏览器失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取运行中的浏览器列表
  ipcMain.handle('get-running-browsers', async () => {
    try {
      return browserManager.getRunningBrowsers();
    } catch (error) {
      console.error('IPC - 获取浏览器列表失败:', error);
      return [];
    }
  });

  // 检查浏览器是否在运行
  ipcMain.handle('is-browser-running', async (event, accountId) => {
    try {
      return browserManager.isBrowserRunning(accountId);
    } catch (error) {
      console.error('IPC - 检查浏览器状态失败:', error);
      return false;
    }
  });

  // 执行浏览器脚本
  ipcMain.handle('execute-script', async (event, accountId, script, options = {}) => {
    try {
      const result = await browserManager.executeScript(accountId, script, options);
      return result;
    } catch (error) {
      console.error('IPC - 执行脚本失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 关闭所有浏览器
  ipcMain.handle('close-all-browsers', async () => {
    try {
      const result = await browserManager.closeAllBrowsers();
      return result;
    } catch (error) {
      console.error('IPC - 关闭所有浏览器失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取Chrome路径
  ipcMain.handle('get-chrome-path', async () => {
    try {
      return browserManager.getChromePath();
    } catch (error) {
      console.error('IPC - 获取Chrome路径失败:', error);
      return null;
    }
  });

  // 设置Chrome路径
  ipcMain.handle('set-chrome-path', async (event, chromePath) => {
    try {
      browserManager.setChromePath(chromePath);
      return { success: true };
    } catch (error) {
      console.error('IPC - 设置Chrome路径失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 清理用户数据
  ipcMain.handle('cleanup-user-data', async (event, accountId) => {
    try {
      browserManager.cleanupUserData(accountId);
      return { success: true };
    } catch (error) {
      console.error('IPC - 清理用户数据失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 显示文件选择对话框
  ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(mainWindow, options);
      return result;
    } catch (error) {
      console.error('IPC - 显示文件对话框失败:', error);
      return { canceled: true };
    }
  });

  // 显示保存文件对话框
  ipcMain.handle('show-save-dialog', async (event, options) => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showSaveDialog(mainWindow, options);
      return result;
    } catch (error) {
      console.error('IPC - 显示保存对话框失败:', error);
      return { canceled: true };
    }
  });

  // 显示消息对话框
  ipcMain.handle('show-message-box', async (event, options) => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showMessageBox(mainWindow, options);
      return result;
    } catch (error) {
      console.error('IPC - 显示消息对话框失败:', error);
      return { response: 0 };
    }
  });

  // 显示错误对话框
  ipcMain.handle('show-error-box', async (event, title, content) => {
    try {
      const { dialog } = require('electron');
      dialog.showErrorBox(title, content);
      return { success: true };
    } catch (error) {
      console.error('IPC - 显示错误对话框失败:', error);
      return { success: false };
    }
  });

  // Shell相关API
  ipcMain.handle('shell-open-external', async (event, url) => {
    try {
      const { shell } = require('electron');
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('IPC - 打开外部链接失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shell-open-path', async (event, path) => {
    try {
      const { shell } = require('electron');
      const result = await shell.openPath(path);
      return { success: true, error: result }; // openPath返回错误字符串，空字符串表示成功
    } catch (error) {
      console.error('IPC - 打开路径失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shell-trash-item', async (event, path) => {
    try {
      const { shell } = require('electron');
      await shell.trashItem(path);
      return { success: true };
    } catch (error) {
      console.error('IPC - 删除文件失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shell-show-item-in-folder', async (event, fullPath) => {
    try {
      const { shell } = require('electron');
      shell.showItemInFolder(fullPath);
      return { success: true };
    } catch (error) {
      console.error('IPC - 在文件夹中显示项目失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 剪贴板相关API
  ipcMain.handle('clipboard-write-text', async (event, text) => {
    try {
      const { clipboard } = require('electron');
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('IPC - 写入剪贴板文本失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard-read-text', async () => {
    try {
      const { clipboard } = require('electron');
      const text = clipboard.readText();
      return { success: true, text };
    } catch (error) {
      console.error('IPC - 读取剪贴板文本失败:', error);
      return { success: false, text: '' };
    }
  });

  ipcMain.handle('clipboard-write-image', async (event, image) => {
    try {
      const { clipboard, nativeImage } = require('electron');
      const img = nativeImage.createFromDataURL(image);
      clipboard.writeImage(img);
      return { success: true };
    } catch (error) {
      console.error('IPC - 写入剪贴板图片失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard-read-image', async () => {
    try {
      const { clipboard } = require('electron');
      const image = clipboard.readImage();
      const dataURL = image.toDataURL();
      return { success: true, image: dataURL };
    } catch (error) {
      console.error('IPC - 读取剪贴板图片失败:', error);
      return { success: false, image: null };
    }
  });

  // 应用信息相关API
  ipcMain.handle('get-app-version', async () => {
    try {
      const { app } = require('electron');
      return { success: true, version: app.getVersion() };
    } catch (error) {
      console.error('IPC - 获取应用版本失败:', error);
      return { success: false, version: 'unknown' };
    }
  });

  ipcMain.handle('get-app-name', async () => {
    try {
      const { app } = require('electron');
      return { success: true, name: app.getName() };
    } catch (error) {
      console.error('IPC - 获取应用名称失败:', error);
      return { success: false, name: 'unknown' };
    }
  });

  // 窗口控制相关API
  ipcMain.handle('minimize-window', async () => {
    try {
      if (mainWindow) {
        mainWindow.minimize();
        return { success: true };
      }
      return { success: false, error: 'Window not found' };
    } catch (error) {
      console.error('IPC - 最小化窗口失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('maximize-window', async () => {
    try {
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        return { success: true, isMaximized: mainWindow.isMaximized() };
      }
      return { success: false, error: 'Window not found' };
    } catch (error) {
      console.error('IPC - 最大化窗口失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('close-window', async () => {
    try {
      if (mainWindow) {
        mainWindow.close();
        return { success: true };
      }
      return { success: false, error: 'Window not found' };
    } catch (error) {
      console.error('IPC - 关闭窗口失败:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('is-maximized', async () => {
    try {
      if (mainWindow) {
        return { success: true, isMaximized: mainWindow.isMaximized() };
      }
      return { success: false, isMaximized: false };
    } catch (error) {
      console.error('IPC - 检查窗口状态失败:', error);
      return { success: false, isMaximized: false };
    }
  });

  // 通过浏览器自动化执行小红书图文发布
  ipcMain.handle('publish-via-selenium', async (event, payload) => {
    try {
      // 检查功能权限
      const permission = licenseManager.checkFeaturePermission('auto_publish');
      if (!permission.allowed) {
        return { success: false, error: '无发布权限，请检查许可证状态' };
      }

      // 校验参数
      if (!payload || !payload.account || !payload.content) {
        return { success: false, error: '参数不完整' };
      }

      // 准备发布内容
      const content = {
        title: payload.content.title || '',
        body: payload.content.content || payload.content.body || '',
        content: payload.content.content || payload.content.body || '',
        tags: payload.content.tags || '',
        images: payload.content.images || []
      };

      // 调用 browserManager 的发布方法
      const result = await browserManager.publishXhsContent(payload.account.id, content);
      return result;
    } catch (error) {
      console.error('IPC - publish-via-selenium 失败:', error);
      return { success: false, error: error.message };
    }
  });

  // ========== 认证系统相关 IPC 处理 ==========

  // 激活卡密
  ipcMain.handle('activate-card-key', async (event, cardKey) => {
    try {
      console.log('IPC - 激活卡密:', cardKey);
      const result = await licenseManager.activateLicense(cardKey);
      return result;
    } catch (error) {
      console.error('IPC - 激活卡密失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 验证许可证
  ipcMain.handle('validate-license', async () => {
    try {
      const result = await licenseManager.validateLicense();
      return result;
    } catch (error) {
      console.error('IPC - 验证许可证失败:', error);
      return { valid: false, reason: 'validation_error', message: error.message };
    }
  });

  // 获取许可证状态
  ipcMain.handle('get-license-status', async () => {
    try {
      const status = licenseManager.getLicenseStatus();
      return { success: true, status: status };
    } catch (error) {
      console.error('IPC - 获取许可证状态失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 检查功能权限
  ipcMain.handle('check-feature-permission', async (event, featureName) => {
    try {
      const permission = licenseManager.checkFeaturePermission(featureName);
      return { success: true, permission: permission };
    } catch (error) {
      console.error('IPC - 检查功能权限失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 获取当前许可证
  ipcMain.handle('get-current-license', async () => {
    try {
      const license = licenseManager.getCurrentLicense();
      return { success: true, license: license };
    } catch (error) {
      console.error('IPC - 获取当前许可证失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 移除许可证
  ipcMain.handle('remove-license', async () => {
    try {
      console.log('licenseManager类型:', typeof licenseManager);
      console.log('licenseManager方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(licenseManager)));
      
      // 尝试调用 deleteLicense 方法（备用方案）
      if (typeof licenseManager.removeLicense === 'function') {
        console.log('使用 removeLicense 方法');
        const result = await licenseManager.removeLicense();
        return result;
      } else if (typeof licenseManager.deleteLicense === 'function') {
        console.log('使用 deleteLicense 方法作为备用');
        const result = await licenseManager.deleteLicense();
        return result;
      } else {
        // 最后的备用方案 - 直接删除文件
        console.log('使用直接文件删除作为最后备用方案');
        const fs = require('fs');
        const path = require('path');
        const licenseFile = path.join(__dirname, 'auth', 'license.enc');
        
        if (fs.existsSync(licenseFile)) {
          fs.unlinkSync(licenseFile);
        }
        
        // 重置许可证管理器状态
        if (licenseManager.currentLicense !== undefined) {
          licenseManager.currentLicense = null;
        }
        
        console.log('许可证文件已删除');
        return { success: true, message: '许可证已成功删除' };
      }
    } catch (error) {
      console.error('IPC - 移除许可证失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 获取设备信息
  ipcMain.handle('get-device-info', async () => {
    try {
      const deviceInfo = await deviceFingerprint.generateFingerprint();
      const deviceId = await deviceFingerprint.generateDeviceId();
      return {
        success: true,
        deviceInfo: {
          deviceId: deviceId,
          fingerprint: deviceInfo.fingerprint,
          components: deviceInfo.components
        }
      };
    } catch (error) {
      console.error('IPC - 获取设备信息失败:', error);
      return { success: false, message: error.message };
    }
  });

  // ========== 管理员功能相关 IPC 处理 ==========

  // 生成卡密
  ipcMain.handle('generate-card-keys', async (event, config) => {
    try {
      console.log('IPC - 生成卡密:', config);
      const result = await cardGenerator.generateBatchCards(config);
      return result;
    } catch (error) {
      console.error('IPC - 生成卡密失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 获取卡密详情
  ipcMain.handle('get-card-details', async (event, cardKey) => {
    try {
      const result = await cardGenerator.getCardDetails(cardKey);
      return { success: true, result: result };
    } catch (error) {
      console.error('IPC - 获取卡密详情失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 获取使用统计
  ipcMain.handle('get-usage-statistics', async (event, agentId) => {
    try {
      const statistics = await cardGenerator.getUsageStatistics(agentId);
      return { success: true, statistics: statistics };
    } catch (error) {
      console.error('IPC - 获取使用统计失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 导出卡密
  ipcMain.handle('export-cards', async (event, filter) => {
    try {
      const cards = await cardGenerator.exportCards(filter);
      return { success: true, cards: cards };
    } catch (error) {
      console.error('IPC - 导出卡密失败:', error);
      return { success: false, message: error.message };
    }
  });

  // 代理连接测试
  ipcMain.handle('test-proxy', async (event, proxyConfig) => {
    try {
      console.log('🔍 开始测试代理连接:', {
        type: proxyConfig.type,
        host: proxyConfig.host,
        port: proxyConfig.port,
        hasAuth: !!(proxyConfig.username && proxyConfig.password)
      });
      
      const result = await testProxyConnection(proxyConfig);
      return result;
    } catch (error) {
      console.error('IPC - 代理测试失败:', error);
      return { success: false, error: error.message };
    }
  });
}

// 获取Chrome可执行文件路径
function getChromeExecutablePath() {
  const os = require('os');
  const platform = os.platform();
  
  let chromePaths = [];
  
  switch (platform) {
    case 'win32':
      chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
      ];
      break;
    case 'darwin':
      chromePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      ];
      break;
    case 'linux':
      chromePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
      ];
      break;
    default:
      throw new Error(`不支持的操作系统: ${platform}`);
  }
  
  // 检查路径是否存在
  console.log(`🔍 搜索Chrome路径，平台: ${platform}`);
  for (const chromePath of chromePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
      console.log(`✅ 找到Chrome路径: ${chromePath}`);
      return chromePath;
    } else {
      console.log(`❌ 路径不存在: ${chromePath}`);
    }
  }
  
  // 如果没找到，抛出错误
  throw new Error(`未找到Chrome浏览器，请确保已安装Google Chrome。搜索路径: ${chromePaths.join(', ')}`);
}

// 自动打开浏览器验证IP地址 - 使用代理转换器
async function openBrowserForIPVerification(proxyConfig, testResult) {
  try {
    console.log('🌐 开始自动浏览器IP验证...');
    console.log('📊 测试结果IP:', testResult.ip);
    console.log('📍 测试结果位置:', testResult.location);
    
    const { type, host, port, username, password } = proxyConfig;
    
    // 如果是SOCKS5代理，启动本地代理转换器
    if (type === 'socks5') {
      console.log('🔧 检测到SOCKS5代理，启动本地HTTP到SOCKS5转换器...');
      
      // 停止之前的转换器（如果存在）
      if (proxyConverter) {
        console.log('🛑 停止之前的代理转换器...');
        await proxyConverter.stop();
      }
      
      // 创建新的代理转换器
      const localPort = 8080 + Math.floor(Math.random() * 100); // 随机端口避免冲突
      proxyConverter = new ProxyConverter({
        localPort: localPort,
        socksHost: host,
        socksPort: port,
        socksUsername: username,
        socksPassword: password
      });
      
      // 启动代理转换器
      await proxyConverter.start();
      
      // 使用本地HTTP代理
      var proxyUrl = `http://127.0.0.1:${localPort}`;
      console.log('✅ 代理转换器启动成功');
      console.log('🔄 Chrome将使用本地HTTP代理:', proxyUrl);
      
    } else {
      // 非SOCKS5代理，直接使用
      if (username && password) {
        const encodedUsername = encodeURIComponent(username);
        const encodedPassword = encodeURIComponent(password);
        var proxyUrl = `${type}://${encodedUsername}:${encodedPassword}@${host}:${port}`;
      } else {
        var proxyUrl = `${type}://${host}:${port}`;
      }
      console.log('🔧 直接使用代理配置:', proxyUrl);
    }
    
    // 生成唯一的调试端口
    const debugPort = 9400 + Math.floor(Math.random() * 100);
    console.log('🔍 使用调试端口:', debugPort);
    
    // 构建Chrome启动参数
    const chromeArgs = [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-component-extensions-with-background-pages',
      `--remote-debugging-port=${debugPort}`,
      '--remote-allow-origins=*',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--force-webrtc-ip-handling-policy=default_public_interface_only',
      '--disable-blink-features=AutomationControlled',
      `--user-data-dir=${path.join(__dirname, 'user-data', 'chrome-profiles', `verification_${Date.now()}`)}`,
      '--window-size=800,600',
      '--window-position=200,200',
      `--proxy-server=${proxyUrl}`,
      '--enable-automation',
      '--disable-background-networking',
      '--no-pings'
    ];
    
    // IP检测网站列表
    const ipCheckSites = [
      'https://ipinfo.io',
      'https://ip.cn',
      'https://whatismyipaddress.com',
      'https://httpbin.org/ip'
    ];
    
    // 选择一个IP检测网站
    const targetSite = ipCheckSites[0]; // 使用ipinfo.io
    chromeArgs.push(targetSite);
    
    console.log('🚀 启动验证浏览器...');
    console.log('🎯 目标网站:', targetSite);
    console.log('⚙️ 启动参数预览:', chromeArgs.slice(0, 5).join(' '), '...');
    
    // 启动Chrome进程
    let chromePath;
    try {
      // 确保函数存在
      if (typeof getChromeExecutablePath !== 'function') {
        throw new Error('getChromeExecutablePath函数未定义');
      }
      chromePath = getChromeExecutablePath();
    } catch (chromeError) {
      console.error('❌ Chrome路径检测失败:', chromeError.message);
      throw new Error(`无法启动验证浏览器: ${chromeError.message}`);
    }
    
    console.log('🚀 准备启动Chrome进程...');
    const chromeProcess = spawn(chromePath, chromeArgs, {
      stdio: 'ignore',
      detached: false
    });
    
    console.log('✅ 验证浏览器已启动, PID:', chromeProcess.pid);
    console.log('📝 调试信息:');
    console.log('   - 原始代理类型:', type);
    console.log('   - 原始代理地址:', `${host}:${port}`);
    console.log('   - 认证状态:', username ? '已启用' : '未启用');
    console.log('   - Chrome使用代理:', proxyUrl);
    console.log('   - 预期IP:', testResult.ip);
    console.log('   - 预期位置:', testResult.location);
    console.log('   - 调试端口:', debugPort);
    console.log('   - 检测网站:', targetSite);
    
    if (type === 'socks5') {
      console.log('💡 提示: 本地代理转换器正在运行，Chrome通过HTTP代理访问SOCKS5服务器');
    }
    
    // 等待一段时间让浏览器启动
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return {
      success: true,
      browserPid: chromeProcess.pid,
      debugPort: debugPort,
      targetSite: targetSite,
      expectedIp: testResult.ip,
      expectedLocation: testResult.location,
      converterPort: type === 'socks5' ? proxyConverter.localPort : null,
      message: type === 'socks5' ? 
        '验证浏览器已启动，使用本地代理转换器解决SOCKS5兼容性问题' : 
        '验证浏览器已启动，请手动检查IP地址是否匹配'
    };
    
  } catch (error) {
    console.error('❌ 自动浏览器验证失败:', error);
    
    // 清理代理转换器
    if (proxyConverter) {
      try {
        await proxyConverter.stop();
        proxyConverter = null;
      } catch (cleanupError) {
        console.error('⚠️  清理代理转换器失败:', cleanupError.message);
      }
    }
    
    return {
      success: false,
      error: error.message,
      message: '自动浏览器验证启动失败'
    };
  }
}

// 代理连接测试函数
async function testProxyConnection(proxyConfig) {
  const { type, host, port, username, password } = proxyConfig;
  
  try {
    console.log(`🔍 开始测试代理: ${type}://${host}:${port}`);
    
    // 构建代理URL和配置
    let proxyUrl = '';
    let agentOptions = {};
    
    if (username && password) {
      // 确保用户名和密码正确编码
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      proxyUrl = `${type}://${encodedUsername}:${encodedPassword}@${host}:${port}`;
      
      console.log(`🔐 使用认证代理: ${type}://${username}:***@${host}:${port}`);
    } else {
      proxyUrl = `${type}://${host}:${port}`;
      console.log(`🌐 使用无认证代理: ${proxyUrl}`);
    }
    
    // 根据代理类型创建agent
    let agent;
    try {
      switch (type.toLowerCase()) {
        case 'http':
          agent = new HttpProxyAgent(proxyUrl);
          break;
        case 'https':
          agent = new HttpsProxyAgent(proxyUrl);
          break;
        case 'socks4':
        case 'socks5':
          agent = new SocksProxyAgent(proxyUrl);
          break;
        default:
          throw new Error(`不支持的代理类型: ${type}`);
      }
      console.log(`✅ 代理Agent创建成功，类型: ${type}`);
    } catch (agentError) {
      console.error(`❌ 代理Agent创建失败:`, agentError.message);
      throw new Error(`代理配置错误: ${agentError.message}`);
    }
    
    // 执行测试请求
    const testResult = await makeTestRequest(agent);
    
    console.log(`✅ 代理测试成功:`, testResult);
    
    // 🌐 自动打开浏览器验证IP地址
    const verificationResult = await openBrowserForIPVerification(proxyConfig, testResult);
    
    return {
      success: true,
      ip: testResult.ip,
      location: testResult.location || 'Unknown',
      responseTime: testResult.responseTime,
      status: testResult.status,
      browserVerification: verificationResult
    };
    
  } catch (error) {
    console.error(`❌ 代理测试失败:`, error.message);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// 执行测试请求
function makeTestRequest(agent, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // 使用多个测试URL提高成功率，优先使用包含地理位置信息的API
    const testUrls = [
      'https://ipapi.co/json/',   // 包含地理位置信息
      'https://ifconfig.me/all.json', // 包含地理位置信息
      'http://ip-api.com/json/',  // 包含详细地理位置信息（注意：ip-api只支持http）
      'https://httpbin.org/ip',   // 备用，仅IP
      'https://api.ipify.org?format=json'
    ];
    
    // 尝试第一个URL
    const options = {
      agent: agent,
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    
    console.log(`🌐 发起测试请求到: ${testUrls[0]}`);
    
    // 根据URL协议选择合适的模块
    const isHttps = testUrls[0].startsWith('https');
    const requestModule = isHttps ? https : http;
    
    const req = requestModule.get(testUrls[0], options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseTime = Date.now() - startTime;
          console.log(`📊 收到响应，耗时: ${responseTime}ms, 状态码: ${res.statusCode}`);
          
          // 检查HTTP状态码
          if (res.statusCode === 407) {
            reject(new Error('代理认证失败 - 请检查用户名和密码'));
            return;
          }
          
          if (res.statusCode === 403) {
            reject(new Error('代理访问被拒绝 - 请检查代理配置'));
            return;
          }
          
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP错误: ${res.statusCode} - ${data.substring(0, 100)}`));
            return;
          }
          
          // 检查响应内容类型
          const contentType = res.headers['content-type'] || '';
          console.log(`📄 响应类型: ${contentType}`);
          
          // 如果返回的是HTML（通常是代理认证页面）
          if (contentType.includes('text/html') || data.trim().startsWith('<')) {
            // 检查是否包含代理认证相关的关键词
            if (data.includes('Proxy Auth') || data.includes('Authorization Required') || 
                data.includes('407') || data.includes('authentication')) {
              reject(new Error('代理认证失败 - 需要提供正确的用户名和密码'));
              return;
            }
            
            // 尝试从HTML中提取IP地址
            const ipMatch = data.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
            if (ipMatch) {
              resolve({
                ip: ipMatch[0],
                location: 'Unknown',
                responseTime: responseTime,
                status: res.statusCode
              });
              return;
            }
            
            reject(new Error('收到HTML响应而非JSON - 可能是代理配置问题'));
            return;
          }
          
          let result;
          try {
            // 尝试解析JSON
            result = JSON.parse(data);
            console.log(`✅ JSON解析成功:`, result);
          } catch (parseError) {
            console.log(`⚠️ JSON解析失败，尝试文本解析: ${parseError.message}`);
            // 如果JSON解析失败，尝试从纯文本中提取IP
            const ipMatch = data.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
            if (ipMatch) {
              result = { ip: ipMatch[0] };
              console.log(`📍 从文本中提取到IP: ${ipMatch[0]}`);
            } else {
              console.error(`❌ 无法从响应中提取IP，数据前100字符: ${data.substring(0, 100)}`);
              reject(new Error(`响应解析失败: ${parseError.message.substring(0, 100)}`));
              return;
            }
          }
          
          // 提取IP地址
          const extractedIP = result.origin || result.ip || result.query || 'Unknown';
          
          // 提取地理位置信息（支持多种API格式）
          let locationInfo = 'Unknown';
          if (result.country) {
            // ip-api.com 格式: country, regionName, city
            const parts = [];
            if (result.city) parts.push(result.city);
            if (result.regionName || result.region) parts.push(result.regionName || result.region);  
            if (result.country) parts.push(result.country);
            locationInfo = parts.join(', ') || result.country;
          } else if (result.country_name) {
            // ipapi.co 格式: city, region, country_name
            const parts = [];
            if (result.city) parts.push(result.city);
            if (result.region) parts.push(result.region);
            if (result.country_name) parts.push(result.country_name);
            locationInfo = parts.join(', ') || result.country_name;
          }
          
          resolve({
            ip: extractedIP,
            location: locationInfo,
            responseTime: responseTime,
            status: res.statusCode
          });
        } catch (parseError) {
          reject(new Error('响应解析失败: ' + parseError.message));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('🚫 网络请求失败:', error.message);
      // 如果第一个URL失败，尝试第二个URL
      if (testUrls.length > 1) {
        console.log('🔄 尝试备用URL...');
        tryAlternativeUrl(agent, testUrls[1], startTime, timeout, resolve, reject);
      } else {
        reject(new Error('网络请求失败: ' + error.message));
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.setTimeout(timeout);
  });
}

// 尝试备用URL
function tryAlternativeUrl(agent, url, startTime, timeout, resolve, reject) {
  const options = {
    agent: agent,
    timeout: timeout,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };
  
  console.log(`🌐 尝试备用URL: ${url}`);
  
  // 根据URL协议选择合适的模块
  const isHttps = url.startsWith('https');
  const requestModule = isHttps ? https : http;
  
  const req = requestModule.get(url, options, (res) => {
    let data = '';
    
    res.on('data', chunk => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const responseTime = Date.now() - startTime;
        console.log(`📊 备用URL响应，耗时: ${responseTime}ms, 状态码: ${res.statusCode}`);
        
        // 检查HTTP状态码
        if (res.statusCode === 407) {
          reject(new Error('代理认证失败 - 请检查用户名和密码'));
          return;
        }
        
        if (res.statusCode === 403) {
          reject(new Error('代理访问被拒绝 - 请检查代理配置'));
          return;
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`备用URL HTTP错误: ${res.statusCode} - ${data.substring(0, 100)}`));
          return;
        }
        
        // 检查响应内容类型
        const contentType = res.headers['content-type'] || '';
        console.log(`📄 备用URL响应类型: ${contentType}`);
        
        // 如果返回的是HTML（通常是代理认证页面）
        if (contentType.includes('text/html') || data.trim().startsWith('<')) {
          // 检查是否包含代理认证相关的关键词
          if (data.includes('Proxy Auth') || data.includes('Authorization Required') || 
              data.includes('407') || data.includes('authentication')) {
            reject(new Error('代理认证失败 - 需要提供正确的用户名和密码'));
            return;
          }
          
          // 尝试从HTML中提取IP地址
          const ipMatch = data.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
          if (ipMatch) {
            resolve({
              ip: ipMatch[0],
              location: 'Unknown',
              responseTime: responseTime,
              status: res.statusCode
            });
            return;
          }
          
          reject(new Error('备用URL收到HTML响应而非JSON - 可能是代理配置问题'));
          return;
        }
        
        let result;
        try {
          result = JSON.parse(data);
          console.log(`✅ 备用URL JSON解析成功:`, result);
        } catch (parseError) {
          console.log(`⚠️ 备用URL JSON解析失败，尝试文本解析: ${parseError.message}`);
          // 尝试从纯文本中提取IP
          const ipMatch = data.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/);
          if (ipMatch) {
            result = { ip: ipMatch[0] };
            console.log(`📍 从备用URL文本中提取到IP: ${ipMatch[0]}`);
          } else {
            console.error(`❌ 无法从备用URL响应中提取IP，数据前100字符: ${data.substring(0, 100)}`);
            reject(new Error(`备用URL响应解析失败: ${parseError.message.substring(0, 100)}`));
            return;
          }
        }
        
        // 提取IP地址
        const extractedIP = result.origin || result.ip || result.query || 'Unknown';
        
        // 提取地理位置信息（支持多种API格式）
        let locationInfo = 'Unknown';
        if (result.country) {
          // ip-api.com 格式: country, regionName, city
          const parts = [];
          if (result.city) parts.push(result.city);
          if (result.regionName || result.region) parts.push(result.regionName || result.region);  
          if (result.country) parts.push(result.country);
          locationInfo = parts.join(', ') || result.country;
        } else if (result.country_name) {
          // ipapi.co 格式: city, region, country_name
          const parts = [];
          if (result.city) parts.push(result.city);
          if (result.region) parts.push(result.region);
          if (result.country_name) parts.push(result.country_name);
          locationInfo = parts.join(', ') || result.country_name;
        }
        
        resolve({
          ip: extractedIP,
          location: locationInfo,
          responseTime: responseTime,
          status: res.statusCode
        });
      } catch (parseError) {
        reject(new Error('备用URL响应解析失败: ' + parseError.message));
      }
    });
  });
  
  req.on('error', (error) => {
    reject(new Error('备用URL请求失败: ' + error.message));
  });
  
  req.on('timeout', () => {
    req.destroy();
    reject(new Error('备用URL请求超时'));
  });
  
  req.setTimeout(timeout);
}

// 应用退出时清理
app.on('before-quit', async () => {
  console.log('应用即将退出，关闭所有浏览器进程...');
  try {
    await browserManager.closeAllBrowsers();
  } catch (error) {
    console.error('清理浏览器进程失败:', error);
  }
  
  // 清理代理转换器
  try {
    await browserManager.stopAllProxyConverters();
  } catch (error) {
    console.error('❌ 清理代理转换器失败:', error);
  }
  
  // 清理旧的全局代理转换器（如果存在）
  if (proxyConverter) {
    console.log('🛑 关闭旧版代理转换器...');
    try {
      await proxyConverter.stop();
      proxyConverter = null;
      console.log('✅ 旧版代理转换器已关闭');
    } catch (error) {
      console.error('❌ 清理旧版代理转换器失败:', error);
    }
  }
});