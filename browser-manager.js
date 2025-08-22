const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const ProxyConverter = require('./proxy-converter');

let CDP = null;
try {
    // 延迟加载，避免在未安装依赖时直接崩溃
    CDP = require('chrome-remote-interface');
} catch (e) {
    // 在实际调用时再给出明确提示
    CDP = null;
}

/**
 * 浏览器进程管理器
 */
class BrowserManager {
    constructor() {
        this.processes = new Map(); // 存储进程信息
        this.chromePath = this.findChromePath();
        // 使用应用程序目录下的用户数据目录，确保便携性
        // 这样打包分发给其他用户时，登录状态会保存在应用程序目录内
        this.userDataDir = path.join(__dirname, 'user-data', 'chrome-profiles');
        this.nextDebuggingPort = 9333; // 为远程调试端口分配起始值
        this.pendingProxyAuth = new Map(); // 存储待处理的代理认证信息
        
        // 代理转换器管理
        this.proxyConverters = new Map(); // 存储不同SOCKS5代理的转换器实例
        this.nextConverterPort = 8080; // HTTP代理转换器端口起始值
        
        // 确保用户数据目录存在
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }
    }

    /**
     * 查找Chrome可执行文件路径
     */
    findChromePath() {
        const platform = os.platform();
        const possiblePaths = [];

        if (platform === 'win32') {
            possiblePaths.push(
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
            );
        } else if (platform === 'darwin') {
            possiblePaths.push(
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
                '/Applications/Chromium.app/Contents/MacOS/Chromium'
            );
        } else {
            possiblePaths.push(
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/snap/bin/chromium',
                '/usr/bin/microsoft-edge'
            );
        }

        for (const chromePath of possiblePaths) {
            if (fs.existsSync(chromePath)) {
                return chromePath;
            }
        }

        throw new Error('未找到Chrome浏览器，请确保已安装Chrome或Edge浏览器');
    }

    /**
     * 构建Chrome启动参数
     */
    buildChromeArgs(account, options = {}) {
        const args = [];
        
        // 基础参数
        args.push('--no-first-run');
        args.push('--no-default-browser-check');
        args.push('--disable-background-timer-throttling');
        args.push('--disable-backgrounding-occluded-windows');
        args.push('--disable-renderer-backgrounding');
        args.push('--disable-features=TranslateUI');
        args.push('--disable-component-extensions-with-background-pages');
        
        // 无头模式支持
        if (options.headless) {
            args.push('--headless');
            args.push('--disable-gpu');
            args.push('--no-sandbox');
            args.push('--disable-dev-shm-usage');
            console.log('✅ 启用无头模式运行');
        }
        
        // 允许远程调试与跨源（用于CDP连接）
        if (options.debuggingPort) {
            args.push(`--remote-debugging-port=${options.debuggingPort}`);
            args.push('--remote-allow-origins=*');
            // 添加稳定性参数
            args.push('--disable-web-security');
            args.push('--disable-features=VizDisplayCompositor');
            args.push('--force-webrtc-ip-handling-policy=default_public_interface_only');
            args.push('--disable-blink-features=AutomationControlled');
        }
        
        // 用户数据目录（每个账号独立）
        const profileDir = path.join(this.userDataDir, `profile_${account.id}`);
        args.push(`--user-data-dir=${profileDir}`);
        
        // 窗口配置
        if (options.windowConfig) {
            const { width = 1200, height = 800, left = 100, top = 100 } = options.windowConfig;
            args.push(`--window-size=${width},${height}`);
            args.push(`--window-position=${left},${top}`);
        }



        // 指纹配置（如果有）
        this.addFingerprintArgs(args, account);

        // 代理配置
        this.addProxyArgs(args, account);

        // 启动URL
        if (options.url) {
            args.push(options.url);
        }

        return args;
    }

    /**
     * 检查是否有Chrome进程在运行
     */
    async checkChromeProcesses() {
        try {
            const { spawn } = require('child_process');
            
            return new Promise((resolve) => {
                // 在Windows上使用tasklist检查Chrome进程
                const tasklist = spawn('tasklist', ['/FI', 'IMAGENAME eq chrome.exe'], {
                    stdio: 'pipe'
                });
                
                let output = '';
                tasklist.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                tasklist.on('close', (code) => {
                    // 检查输出中是否包含chrome.exe
                    const hasChromeProcess = output.toLowerCase().includes('chrome.exe');
                    resolve(hasChromeProcess);
                });
                
                tasklist.on('error', () => {
                    // 如果命令失败，假设有进程在运行
                    resolve(true);
                });
                
                // 超时处理
                setTimeout(() => {
                    tasklist.kill();
                    resolve(true);
                }, 3000);
            });
        } catch (error) {
            console.warn('检查Chrome进程失败:', error.message);
            return true; // 默认假设有进程在运行
        }
    }





    /**
     * 添加指纹参数（完整实现）
     * 支持从生成的指纹配置中提取并应用各种浏览器指纹参数
     */
    addFingerprintArgs(args, account) {
        console.log('🔧 正在配置浏览器指纹参数...');
        
        // 获取指纹配置（优先使用fingerprintConfig，后备方案使用单独字段）
        const fingerprintConfig = account.fingerprintConfig;
        
        // === 基础指纹参数（通过Chrome启动参数设置） ===
        
        // 1. User-Agent
        const userAgent = fingerprintConfig?.userAgent || account.userAgent;
        if (userAgent) {
            args.push(`--user-agent=${userAgent}`);
            console.log(`✅ User-Agent: ${userAgent.substring(0, 50)}...`);
        }

        // 2. 语言设置
        const languages = fingerprintConfig?.languages || (account.language ? [account.language] : null);
        const locale = fingerprintConfig?.locale || account.language;
        if (languages && languages.length > 0) {
            const langString = languages.join(',');
            args.push(`--lang=${locale || languages[0]}`);
            args.push(`--accept-lang=${langString}`);
            console.log(`✅ 语言设置: ${langString}`);
        }

        // 3. 时区
        const timezone = fingerprintConfig?.timezone || account.timezone;
        if (timezone) {
            args.push(`--timezone=${timezone}`);
            console.log(`✅ 时区: ${timezone}`);
        }

        // 4. 屏幕和设备参数
        const screen = fingerprintConfig?.screen;
        if (screen) {
            // 屏幕分辨率
            if (screen.width && screen.height) {
                args.push(`--window-size=${screen.width},${screen.height}`);
                console.log(`✅ 屏幕分辨率: ${screen.width}x${screen.height}`);
            }
            
            // 设备像素比
            if (screen.pixelRatio) {
                args.push(`--force-device-scale-factor=${screen.pixelRatio}`);
                console.log(`✅ 设备像素比: ${screen.pixelRatio}`);
            }
            
            // 色深
            if (screen.colorDepth) {
                args.push(`--force-color-profile=srgb`);
                console.log(`✅ 颜色配置: sRGB (${screen.colorDepth}位)`);
            }
        } else if (account.screenWidth && account.screenHeight) {
            // 后备方案：使用单独的屏幕字段
            args.push(`--window-size=${account.screenWidth},${account.screenHeight}`);
            args.push(`--force-device-scale-factor=1`);
            console.log(`✅ 屏幕分辨率 (后备): ${account.screenWidth}x${account.screenHeight}`);
        }

        // 5. 硬件相关参数
        if (fingerprintConfig) {
            // CPU核心数
            if (fingerprintConfig.hardwareConcurrency || fingerprintConfig.cores) {
                const cores = fingerprintConfig.hardwareConcurrency || fingerprintConfig.cores;
                // 注意: Chrome没有直接参数设置CPU核心数，这需要通过CDP注入
                console.log(`📝 CPU核心数 (需CDP注入): ${cores}`);
            }
            
            // 设备内存
            if (fingerprintConfig.deviceMemory || fingerprintConfig.memory) {
                const memory = fingerprintConfig.deviceMemory || Math.floor(fingerprintConfig.memory / 1024);
                // 注意: 设备内存也需要通过CDP注入
                console.log(`📝 设备内存 (需CDP注入): ${memory}GB`);
            }
        }

        // 6. 媒体和权限相关
        if (fingerprintConfig) {
            // 禁用WebRTC IP泄露
            args.push('--force-webrtc-ip-handling-policy=default_public_interface_only');
            
            // 媒体设备权限
            args.push('--use-fake-ui-for-media-stream');
            args.push('--use-fake-device-for-media-stream');
            
            console.log('✅ WebRTC IP保护和媒体设备模拟已启用');
        }

        // 7. Canvas和WebGL相关（部分通过启动参数，部分需CDP注入）
        if (fingerprintConfig?.canvas || fingerprintConfig?.webgl) {
            // 启用硬件加速（确保WebGL正常工作）
            args.push('--enable-gpu');
            args.push('--enable-webgl');
            args.push('--enable-accelerated-2d-canvas');
            
            console.log('✅ Canvas和WebGL支持已启用 (详细信息需CDP注入)');
        }

        // 8. 安全和隐私增强
        args.push('--disable-blink-features=AutomationControlled'); // 隐藏自动化标识
        args.push('--disable-web-security'); // 允许跨域（某些指纹注入需要）
        args.push('--disable-features=VizDisplayCompositor'); // 提升稳定性
        args.push('--no-first-run'); // 跳过首次运行向导
        args.push('--disable-default-apps'); // 禁用默认应用
        
        console.log('✅ 安全和隐私参数已配置');

        // 存储指纹配置到实例中，供CDP注入使用
        if (fingerprintConfig) {
            this.pendingFingerprintInjection = this.pendingFingerprintInjection || new Map();
            this.pendingFingerprintInjection.set(account.id, fingerprintConfig);
            console.log(`📦 指纹配置已存储，等待CDP注入: 账号${account.id}`);
        }

        console.log('🎯 浏览器指纹参数配置完成');
    }







    /**
     * 添加代理参数到Chrome启动参数
     * @param {Array} args - Chrome启动参数数组
     * @param {Object} account - 账号对象，包含代理配置
     */
    addProxyArgs(args, account) {
        // 检查是否配置了代理
        if (!account.proxyType || !account.proxyHost || !account.proxyPort) {
            console.log('📶 未配置代理，使用直连网络');
            return;
        }

        console.log(`🔧 配置代理: ${account.proxyType}://${account.proxyHost}:${account.proxyPort}`);

        // 根据代理类型构建代理服务器参数
        let proxyServer;
        switch (account.proxyType.toLowerCase()) {
            case 'http':
                // ✅ 修复：直接在URL中包含认证信息（Chrome原生支持）
                if (account.proxyUsername && account.proxyPassword) {
                    proxyServer = `http://${account.proxyUsername}:${account.proxyPassword}@${account.proxyHost}:${account.proxyPort}`;
                    console.log('🔐 使用URL内嵌认证方式（推荐）');
                } else {
                    proxyServer = `http://${account.proxyHost}:${account.proxyPort}`;
                }
                break;
            case 'https':
                if (account.proxyUsername && account.proxyPassword) {
                    proxyServer = `https://${account.proxyUsername}:${account.proxyPassword}@${account.proxyHost}:${account.proxyPort}`;
                    console.log('🔐 使用URL内嵌认证方式（推荐）');
                } else {
                    proxyServer = `https://${account.proxyHost}:${account.proxyPort}`;
                }
                break;
            case 'socks4':
                proxyServer = `socks4://${account.proxyHost}:${account.proxyPort}`;
                break;
            case 'socks5':
                // 🔄 使用代理转换器处理SOCKS5代理，避免Chrome兼容性问题
                console.log('🔄 检测到SOCKS5代理，将使用HTTP代理转换器');
                
                // 启动代理转换器（如果尚未启动）
                const converterPort = this.ensureProxyConverter(account);
                if (converterPort) {
                    proxyServer = `http://127.0.0.1:${converterPort}`;
                    console.log(`🔄 SOCKS5代理已转换为HTTP代理: ${proxyServer}`);
                } else {
                    // 回退到直接SOCKS5（可能会有兼容性问题）
                    console.warn('⚠️ 代理转换器启动失败，回退到直接SOCKS5模式');
                    if (account.proxyUsername && account.proxyPassword) {
                        proxyServer = `socks5://${account.proxyUsername}:${account.proxyPassword}@${account.proxyHost}:${account.proxyPort}`;
                        console.log('🔐 使用URL内嵌认证方式（推荐）');
                    } else {
                        proxyServer = `socks5://${account.proxyHost}:${account.proxyPort}`;
                    }
                }
                break;
            default:
                console.warn(`⚠️ 不支持的代理类型: ${account.proxyType}`);
                return;
        }

        // 添加代理服务器参数
        args.push(`--proxy-server=${proxyServer}`);
        
        // 代理认证处理
        if (account.proxyUsername && account.proxyPassword) {
            console.log('🔐 检测到代理认证信息，将启用自动认证');
            
            // 启用远程调试以便自动处理认证
            args.push('--enable-automation');
            args.push('--disable-web-security');
            args.push('--disable-features=VizDisplayCompositor');
            args.push('--disable-blink-features=AutomationControlled');
        }

        // 添加其他代理相关的稳定性参数
        args.push('--disable-background-networking');
        args.push('--no-pings');
        args.push('--disable-background-timer-throttling');
        
        console.log(`✅ 代理配置已应用: ${proxyServer}`);
    }

    /**
     * 确保SOCKS5代理转换器启动并返回HTTP代理端口
     * @param {Object} account - 账号配置对象
     * @returns {number|null} - HTTP代理端口号，如果失败返回null
     */
    ensureProxyConverter(account) {
        try {
            // 生成代理转换器的唯一标识
            const proxyKey = `${account.proxyHost}:${account.proxyPort}:${account.proxyUsername || 'noauth'}`;
            
            // 检查是否已有运行中的转换器
            if (this.proxyConverters.has(proxyKey)) {
                const converter = this.proxyConverters.get(proxyKey);
                if (converter.isRunning) {
                    console.log(`🔄 复用现有代理转换器: 端口 ${converter.localPort}`);
                    return converter.localPort;
                }
            }
            
            // 分配新的本地端口
            const localPort = this.nextConverterPort++;
            
            // 创建代理转换器配置
            const converterConfig = {
                localPort: localPort,
                socksHost: account.proxyHost,
                socksPort: account.proxyPort,
                socksUsername: account.proxyUsername || null,
                socksPassword: account.proxyPassword || null
            };
            
            console.log(`🚀 启动SOCKS5代理转换器: ${account.proxyHost}:${account.proxyPort} -> 127.0.0.1:${localPort}`);
            
            // 创建并启动转换器
            const converter = new ProxyConverter(converterConfig);
            
            // 同步启动转换器（阻塞等待）
            try {
                // 这里使用同步方式，因为我们需要在Chrome启动前确保转换器就绪
                converter.startSync();
                
                // 存储转换器实例
                this.proxyConverters.set(proxyKey, {
                    converter: converter,
                    localPort: localPort,
                    isRunning: true,
                    proxyKey: proxyKey,
                    config: converterConfig
                });
                
                console.log(`✅ 代理转换器启动成功: 127.0.0.1:${localPort}`);
                return localPort;
                
            } catch (startError) {
                console.error(`❌ 代理转换器启动失败:`, startError.message);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ 创建代理转换器失败:`, error.message);
            return null;
        }
    }

    /**
     * 停止指定的代理转换器
     * @param {string} proxyKey - 代理转换器标识
     */
    async stopProxyConverter(proxyKey) {
        if (this.proxyConverters.has(proxyKey)) {
            const converterInfo = this.proxyConverters.get(proxyKey);
            try {
                await converterInfo.converter.stop();
                console.log(`🛑 代理转换器已停止: ${proxyKey}`);
            } catch (error) {
                console.error(`❌ 停止代理转换器失败:`, error.message);
            }
            this.proxyConverters.delete(proxyKey);
        }
    }

    /**
     * 停止所有代理转换器
     */
    async stopAllProxyConverters() {
        console.log('🛑 正在停止所有代理转换器...');
        const stopPromises = [];
        
        for (const [proxyKey, converterInfo] of this.proxyConverters) {
            stopPromises.push(
                converterInfo.converter.stop().catch(error => {
                    console.error(`❌ 停止代理转换器失败 (${proxyKey}):`, error.message);
                })
            );
        }
        
        await Promise.all(stopPromises);
        this.proxyConverters.clear();
        console.log('✅ 所有代理转换器已停止');
    }

    /**
     * 自动处理代理认证
     * @param {string} accountId - 账号ID
     */
    async handleProxyAuthentication(accountId) {
        const authInfo = this.pendingProxyAuth.get(accountId);
        if (!authInfo) {
            console.log(`⚠️ 未找到账号 ${accountId} 的代理认证信息`);
            return;
        }

        try {
            console.log(`🔑 开始自动处理代理认证: 账号 ${accountId}`);
            
            if (!CDP) {
                console.log('📦 chrome-remote-interface 未安装，使用备用方案');
                return this.fallbackProxyAuth(accountId, authInfo);
            }
            
            // 连接到Chrome DevTools
            const client = await CDP({ port: authInfo.debuggingPort });
            const { Network, Runtime } = client;
            
            // 启用网络域
            await Network.enable();
            await Runtime.enable();
            
            console.log('✅ Chrome DevTools 连接成功');
            
            // 监听认证请求事件
            Network.authRequired((params) => {
                console.log('🔐 检测到代理认证请求，自动提供凭据');
                
                // 自动响应认证
                Network.continueInterceptedRequest({
                    interceptionId: params.requestId,
                    authChallengeResponse: {
                        response: 'ProvideCredentials',
                        username: authInfo.username,
                        password: authInfo.password
                    }
                }).catch(err => {
                    console.error('❌ 认证响应失败:', err.message);
                });
            });
            
            // 启用请求拦截来捕获认证请求
            await Network.setRequestInterception({
                patterns: [{ 
                    urlPattern: '*', 
                    interceptionStage: 'HeadersReceived' 
                }]
            });
            
            console.log('✅ 代理认证监听器已设置，将自动处理认证请求');
            
            // 清理待处理的认证信息
            this.pendingProxyAuth.delete(accountId);
            
            // 5分钟后自动断开连接
            setTimeout(async () => {
                try {
                    await client.close();
                    console.log('🔌 代理认证监听器已断开');
                } catch (err) {
                    // 忽略关闭错误
                }
            }, 300000);
            
        } catch (error) {
            console.error('❌ Chrome DevTools 自动代理认证失败:', error.message);
            console.log('🔄 切换到备用认证方案');
            
            // 如果CDP方法失败，回退到注入脚本方法
            this.fallbackProxyAuth(accountId, authInfo);
        }
    }

    /**
     * 备用代理认证方法 - 注入脚本自动填入
     * @param {string} accountId - 账号ID
     * @param {Object} authInfo - 认证信息
     */
    async fallbackProxyAuth(accountId, authInfo) {
        try {
            console.log('🔄 使用备用方案处理代理认证');
            
            if (!CDP) {
                console.log('💡 提示: 可安装 chrome-remote-interface 以获得更好的代理认证体验');
                console.log('💡 安装命令: npm install chrome-remote-interface');
                console.log('💡 当前将依赖手动输入代理认证信息');
                return;
            }
            
            const client = await CDP({ port: authInfo.debuggingPort });
            const { Runtime } = client;
            await Runtime.enable();
            
            // 注入自动填入认证信息的脚本
            const script = `
                (function() {
                    console.log('🔍 代理认证脚本已注入，监听认证对话框');
                    
                    // 尝试立即查找已存在的认证对话框
                    function tryFillAuth() {
                        const authDialog = document.querySelector('input[type="password"]');
                        if (authDialog) {
                            console.log('🔍 发现认证对话框，自动填入凭据');
                            
                            const usernameField = document.querySelector('input[type="text"], input[name="username"], input[name="user"]');
                            const passwordField = document.querySelector('input[type="password"]');
                            
                            if (usernameField && passwordField) {
                                usernameField.value = '${authInfo.username}';
                                passwordField.value = '${authInfo.password}';
                                
                                console.log('✅ 认证信息已填入');
                                
                                // 尝试自动提交
                                const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button:contains("确定"), button:contains("登录")');
                                if (submitBtn) {
                                    setTimeout(() => {
                                        submitBtn.click();
                                        console.log('🚀 已自动提交认证');
                                    }, 500);
                                }
                                
                                return true;
                            }
                        }
                        return false;
                    }
                    
                    // 立即尝试一次
                    if (tryFillAuth()) {
                        return;
                    }
                    
                    // 监听DOM变化以检测新的认证对话框
                    const observer = new MutationObserver(function() {
                        tryFillAuth();
                    });
                    
                    observer.observe(document.body, { 
                        childList: true, 
                        subtree: true 
                    });
                    
                    // 5分钟后停止监听
                    setTimeout(() => {
                        observer.disconnect();
                        console.log('⏱️ 代理认证监听已停止');
                    }, 300000);
                })();
            `;
            
            await Runtime.evaluate({ expression: script });
            console.log('✅ 代理认证脚本已注入，将自动处理认证对话框');
            
            // 清理待处理的认证信息
            this.pendingProxyAuth.delete(accountId);
            
            // 5分钟后自动断开连接
            setTimeout(async () => {
                try {
                    await client.close();
                    console.log('🔌 备用代理认证监听器已断开');
                } catch (err) {
                    // 忽略关闭错误
                }
            }, 300000);
            
        } catch (error) {
            console.error('❌ 备用代理认证方案也失败:', error.message);
            console.log('💡 请手动输入代理认证信息');
            
            // 清理待处理的认证信息
            this.pendingProxyAuth.delete(accountId);
        }
    }

    /**
     * 启动浏览器实例
     */
    async launchBrowser(account, url, options = {}) {
        try {
            // 检查Chrome路径
            if (!this.chromePath) {
                throw new Error('未找到Chrome浏览器，请检查Chrome是否已安装');
            }

            // 检查是否已经在运行
            if (this.processes.has(account.id)) {
                throw new Error(`账号 ${account.windowName} 的浏览器已在运行中`);
            }

            const windowConfig = options.windowConfig || this.buildWindowConfig(account, options.windowIndex);
            const debuggingPort = options.debuggingPort || (this.nextDebuggingPort++);
            
            // 构建Chrome启动参数，可能会抛出代理配置错误
            const args = this.buildChromeArgs(account, { 
                url, 
                windowConfig,
                debuggingPort,
                ...options 
            });

            console.log(`启动Chrome进程: ${this.chromePath}`);
            console.log(`启动参数:`, args.join(' '));

            const process = spawn(this.chromePath, args, {
                detached: true,
                stdio: 'ignore'
            });

            // 存储进程信息
            const processInfo = {
                pid: process.pid,
                accountId: account.id,
                windowName: account.windowName,
                url: url,
                startTime: new Date(),
                process: process,
                debuggingPort
            };

            this.processes.set(account.id, processInfo);

            // 如果有代理认证信息，设置自动处理
            if (account.proxyUsername && account.proxyPassword) {
                this.pendingProxyAuth.set(account.id, {
                    username: account.proxyUsername,
                    password: account.proxyPassword,
                    debuggingPort
                });
                console.log('🔐 代理认证信息已设置，将在浏览器就绪后自动处理');
            }

            // 检查进程是否成功启动
            if (!process.pid) {
                throw new Error('Chrome进程启动失败：无法获取进程ID');
            }

            console.log(`Chrome进程已启动，PID: ${process.pid}`);

            // 监听进程事件
            process.on('error', (error) => {
                console.error(`浏览器进程启动失败 (${account.windowName}):`, error);
                console.log(`清理进程记录: ${account.id}`);
                this.processes.delete(account.id);
            });

            // 注意：不监听exit事件，因为Chrome主进程会正常退出，
            // 但实际的浏览器窗口由子进程维护
            // process.on('exit', ...) - 已移除

            // 让进程独立运行
            process.unref();

            // 等待 DevTools 端点就绪，避免随后的 CDP 连接被拒绝
            console.log(`等待DevTools端口 ${debuggingPort} 就绪...`);
            const devtoolsReady = await this.waitForDevTools(debuggingPort, 30000, 500);
            if (!devtoolsReady) {
                console.warn(`⚠️ DevTools 未在超时时间内就绪: ${debuggingPort}`);
                // 尝试使用备用端口
                const backupPort = debuggingPort + 1;
                console.log(`尝试使用备用端口: ${backupPort}`);
                this.nextDebuggingPort = backupPort + 1;
                
                // 重新启动Chrome with backup port
                try {
                    process.kill('SIGTERM');
                } catch(e) {
                    console.log('终止原进程时出错（可能已经停止）:', e.message);
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const backupArgs = args.map(arg => 
                    arg.includes('--remote-debugging-port=') 
                        ? `--remote-debugging-port=${backupPort}` 
                        : arg
                );
                
                const backupProcess = spawn(this.chromePath, backupArgs, {
                    detached: true,
                    stdio: ['ignore', 'ignore', 'ignore']
                });
                
                backupProcess.unref();
                console.log(`Chrome重启完成，使用备用端口: ${backupPort}, PID: ${backupProcess.pid}`);
                
                const backupReady = await this.waitForDevTools(backupPort, 30000, 500);
                if (backupReady) {
                    debuggingPort = backupPort;
                    console.log(`✅ 备用端口连接成功: ${backupPort}`);
                    // 更新进程信息
                    this.processes.set(account.id, {
                        pid: backupProcess.pid,
                        debuggingPort: backupPort,
                        startTime: new Date(),
                        url: url,
                        status: 'running',
                        account: account
                    });
                } else {
                    console.error(`❌ 备用端口也失败了: ${backupPort}`);
                }
            } else {
                console.log(`✅ DevTools端口就绪: ${debuggingPort}`);
            }
            
            // 注入指纹配置（如果存在）
            if (this.pendingFingerprintInjection && this.pendingFingerprintInjection.has(account.id)) {
                console.log('🎯 开始注入浏览器指纹配置...');
                try {
                    await this.injectFingerprintConfiguration(account.id, debuggingPort);
                    console.log('✅ 指纹配置注入成功');
                } catch (error) {
                    console.warn('⚠️ 指纹配置注入失败:', error.message);
                    console.log('💡 浏览器将使用基础指纹配置');
                }
            }
            
            // 检查是否有相关的Chrome进程在运行（通过进程名检查）
            const hasActiveChrome = await this.checkChromeProcesses();
            if (!hasActiveChrome) {
                console.warn('⚠️ 未检测到活动的Chrome进程，但这可能是正常的');
            }

            console.log(`进程信息已记录，当前进程数: ${this.processes.size}`);

            // 如果有待处理的代理认证，延迟启动自动处理
            if (this.pendingProxyAuth.has(account.id)) {
                console.log('⏰ 将在3秒后启动代理认证处理');
                setTimeout(() => {
                    this.handleProxyAuthentication(account.id);
                }, 3000);
            }

            return {
                success: true,
                pid: process.pid,
                message: `浏览器已启动 (PID: ${process.pid})`,
                debuggingPort
            };

        } catch (error) {
            console.error('启动浏览器失败:', error);
            
            // 确保清理可能的残留记录
            this.processes.delete(account.id);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 通过CDP连接到指定调试端口，获取可用的页面Target
     */
    async getXhsPageTarget(debuggingPort) {
        if (!CDP) {
            throw new Error('缺少 chrome-remote-interface 依赖，请先安装依赖后重试');
        }
        const targets = await CDP.List({ host: '127.0.0.1', port: debuggingPort });
        // 优先选择URL包含小红书域名的页面
        const preferred = targets.find(t => t.type === 'page' && /xiaohongshu\.com/i.test(t.url || ''))
            || targets.find(t => t.type === 'page');
        if (!preferred) {
            throw new Error('未找到可用的页面目标');
        }
        return preferred;
    }

    async withPageClient(debuggingPort, target, handler) {
        const client = await CDP({ host: '127.0.0.1', port: debuggingPort, target: target });
        const { Runtime, Page } = client;
        try {
            await Promise.all([Runtime.enable(), Page.enable()]);
            return await handler({ Runtime, Page, client });
        } finally {
            await client.close();
        }
    }

    async evaluate(Runtime, expression, options = {}) {
        const { returnByValue = true, awaitPromise = true } = options;
        const result = await Runtime.evaluate({ expression, returnByValue, awaitPromise });
        if (result && result.exceptionDetails) {
            const text = result.exceptionDetails.text || 'Runtime.evaluate 抛出异常';
            throw new Error(text);
        }
        return result.result ? result.result.value : undefined;
    }

    /**
     * 等待 DevTools 调试端口就绪（避免 CDP 连接被拒绝）
     */
    async waitForDevTools(debuggingPort, timeoutMs = 20000, intervalMs = 250) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                await new Promise((resolve, reject) => {
                    const req = http.get({
                        host: '127.0.0.1',
                        port: debuggingPort,
                        path: '/json/version',
                        timeout: 1500
                    }, (res) => {
                        // 读取并丢弃响应体
                        res.resume();
                        // 任意 2xx-4xx 都视为端点已启动
                        const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 500;
                        ok ? resolve() : reject(new Error(`DevTools status ${res.statusCode}`));
                    });
                    req.on('error', reject);
                    req.on('timeout', () => {
                        req.destroy(new Error('DevTools check timeout'));
                    });
                });
                return true;
            } catch (_) {
                // 未就绪，稍后重试
                await new Promise(r => setTimeout(r, intervalMs));
            }
        }
        return false;
    }

    async waitForCondition(Runtime, conditionExpression, timeoutMs = 10000, intervalMs = 200) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const ok = await this.evaluate(Runtime, `(() => { try { return !!(${conditionExpression}); } catch(e) { return false; } })();`);
            if (ok) return true;
            await new Promise(r => setTimeout(r, intervalMs));
        }
        return false;
    }

    /**
     * 在已运行的浏览器窗口中导航到指定URL
     */
    async navigateToUrl(accountId, url) {
        const info = this.processes.get(accountId);
        if (!info) {
            return { success: false, error: '未找到浏览器进程，请先启动该账号的浏览器' };
        }

        const port = info.debuggingPort;
        if (!port) {
            return { success: false, error: '该浏览器实例未启用远程调试端口' };
        }

        if (!CDP) {
            return { success: false, error: '缺少 chrome-remote-interface 依赖，请先安装依赖后重试' };
        }

        try {
            // 再次确保端点就绪（如果被调用前端口尚未就绪）
            await this.waitForDevTools(port, 20000, 250);
            const targets = await CDP.List({ host: '127.0.0.1', port });
            const target = targets.find(t => t.type === 'page') || targets[0];
            if (!target) {
                throw new Error('未找到可用的页面目标');
            }
            const wsTarget = target.webSocketDebuggerUrl || target.id;

            await this.withPageClient(port, wsTarget, async ({ Runtime, Page }) => {
                await Page.enable();
                await Page.navigate({ url });
                // 等待页面加载完成
                await this.waitForCondition(Runtime, `document.readyState==='complete'`, 20000, 250);
                return true;
            });

            // 更新记录中的当前URL
            info.url = url;
            this.processes.set(accountId, info);

            return { success: true, message: '已导航到指定URL' };
        } catch (error) {
            console.error('navigateToUrl 失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 收集小红书通知：混合采集策略（评论详细+红点数字）
     */
    async collectXhsNotifications(accountId, options = {}) {
        const {
            collectCommentDetails = true,  // 是否采集评论详细信息
            collectLikesRedDot = true,     // 是否采集赞和收藏红点数字
            collectFollowRedDot = true     // 是否采集新增关注红点数字
        } = options;

        const info = this.processes.get(accountId);
        if (!info) {
            throw new Error('未找到浏览器进程，请先启动该账号的浏览器');
        }
        const port = info.debuggingPort;
        if (!port) {
            throw new Error('该浏览器实例未启用远程调试端口');
        }

        // 确保 DevTools 可用
        await this.waitForDevTools(port, 20000, 250);
        const target = await this.getXhsPageTarget(port);
        const wsTarget = target.webSocketDebuggerUrl || target.id;

        return await this.withPageClient(port, wsTarget, async ({ Runtime, Page }) => {
            // 1) 读取首页通知红点数字
            const redDotCount = await this.evaluate(Runtime, `(() => {
                const link = document.querySelector('a[href="/notification"]');
                if (!link) return 0;
                const countEl = link.querySelector('.badge-container .count, .count');
                if (!countEl) return 0;
                const n = parseInt((countEl.textContent || '').trim(), 10);
                return isNaN(n) ? 0 : n;
            })();`);

            // 2) 点击通知按钮
            await this.evaluate(Runtime, `(() => {
                const a = document.querySelector('a[href="/notification"]');
                if (a) { a.click(); return true; }
                return false;
            })();`);
            // 等待跳转到通知页
            await this.waitForCondition(Runtime, `location.pathname.includes('/notification')`, 15000, 250);

            // 3) 获取各选项卡的红点数字 - 优化版本，使用精确的选择器
            const tabRedDots = await this.evaluate(Runtime, `(() => {
                const result = {
                    commentRedDot: 0,
                    likeRedDot: 0,
                    followRedDot: 0
                };
                
                // 查找所有选项卡
                const tabs = Array.from(document.querySelectorAll('.reds-tab-item, .tab-item'));
                
                for (const tab of tabs) {
                    const tabText = (tab.textContent || '').trim();
                    
                    // 优化：使用与首页通知红点一致的检测方式
                    // 首先尝试标准的 badge-container 结构
                    let redDotEl = tab.querySelector('.badge-container .count');
                    
                    if (!redDotEl) {
                        // 备用方案1：查找其他常见的红点结构
                        redDotEl = tab.querySelector('.count, .reds-badge, .badge');
                    }
                    
                    if (!redDotEl) {
                        // 备用方案2：模糊匹配包含相关class的元素
                        redDotEl = tab.querySelector('[class*="badge"], [class*="count"], [class*="dot"]');
                    }
                    
                    // 数字解析 - 与首页检测一致的安全机制
                    const redDotNumber = redDotEl ? parseInt((redDotEl.textContent || '').trim(), 10) : 0;
                    const finalNumber = isNaN(redDotNumber) ? 0 : redDotNumber;
                    
                    // 根据选项卡文字内容精确判断类型
                    if (/评论/.test(tabText) || /评论和@/.test(tabText)) {
                        result.commentRedDot = finalNumber;
                    } else if (/赞和收藏/.test(tabText)) {
                        // 精确匹配"赞和收藏"
                        result.likeRedDot = finalNumber;
                    } else if (/新增关注/.test(tabText)) {
                        // 精确匹配"新增关注"  
                        result.followRedDot = finalNumber;
                    } else if (/赞/.test(tabText) || /收藏/.test(tabText)) {
                        // 兼容旧版本的单独"赞"或"收藏"选项卡
                        result.likeRedDot = finalNumber;
                    } else if (/关注/.test(tabText) || /粉丝/.test(tabText)) {
                        // 兼容旧版本的"关注"或"粉丝"选项卡
                        result.followRedDot = finalNumber;
                    }
                }
                
                return result;
            })();`);

            let comments = [];
            
            // 4) 如果需要采集评论详细信息，则点击评论选项卡并采集
            if (collectCommentDetails) {
                // 点击 评论和@ 选项卡
                await this.evaluate(Runtime, `(() => {
                    const tabs = Array.from(document.querySelectorAll('.reds-tab-item, .tab-item'));
                    const target = tabs.find(el => /评论/.test(el.textContent || '')) || null;
                    if (target) { target.click(); return true; }
                    // 有些页面Tab在aria标签或span内
                    const bySpan = Array.from(document.querySelectorAll('span, div')).find(el => /评论和@/.test(el.textContent || ''));
                    if (bySpan) { bySpan.click(); return true; }
                    return false;
                })();`);
                // 等待评论列表出现
                await this.waitForCondition(Runtime, `document.querySelectorAll('.interaction-content, .interaction-hint, .container .interaction-content').length > 0`, 15000, 300);

                // 抓取评论数据
                comments = await this.evaluate(Runtime, `(() => {
                    function pick(el, sel) { const n = el.querySelector(sel); return n ? n.textContent.trim() : ''; }
                    function pickAttr(el, sel, attr) { const n = el.querySelector(sel); return n ? (n.getAttribute(attr) || '').trim() : ''; }
                    function pickSrc(el, sel) { const n = el.querySelector(sel); return n ? (n.currentSrc || n.src || '').trim() : ''; }
                    
                    const nodes = Array.from(document.querySelectorAll('.container'));
                    const items = [];
                    for (const node of nodes) {
                        const hint = pick(node, '.interaction-hint');
                        const content = pick(node, '.interaction-content');
                        const hasCommentLike = /评论/.test(hint) || content;
                        if (!hasCommentLike) continue;
                        const userName = pick(node, '.user-info a');
                        const userProfile = pickAttr(node, '.user-info a', 'href');
                        const timeText = pick(node, '.interaction-time');
                        const avatar = pickSrc(node, 'img.user-avatar');
                        const noteImage = pickSrc(node, '.extra-image');
                        items.push({ userName, userProfile, hint, content, timeText, avatar, noteImage });
                    }
                    return items;
                })();`);
            }

            return {
                success: true,
                accountId,
                // 保持向后兼容
                redDotCount: Number(redDotCount) || 0,
                comments: Array.isArray(comments) ? comments : [],
                // 新增的分层数据
                tabRedDots: {
                    comment: tabRedDots.commentRedDot || 0,
                    like: tabRedDots.likeRedDot || 0,
                    follow: tabRedDots.followRedDot || 0
                },
                collectionOptions: {
                    collectCommentDetails,
                    collectLikesRedDot,
                    collectFollowRedDot
                },
                collectedAt: new Date().toISOString()
            };
        });
    }

    /**
     * 在通知页面中定位到指定用户的通知卡片，点击“回复”，填写内容并发送（步骤3-6）
     */
    async replyToXhsComment(accountId, target) {
        const info = this.processes.get(accountId);
        if (!info) {
            return { success: false, error: '未找到浏览器进程，请先启动该账号的浏览器' };
        }
        const port = info.debuggingPort;
        if (!port) {
            return { success: false, error: '该浏览器实例未启用远程调试端口' };
        }

        try {
            await this.waitForDevTools(port, 20000, 250);
            const targetPage = await this.getXhsPageTarget(port);
            const wsTarget = targetPage.webSocketDebuggerUrl || targetPage.id;

            const userProfile = (target && target.userProfile) || '';
            const userName = (target && target.userName) || '';
            const replyText = (target && target.text) || '';

            return await this.withPageClient(port, wsTarget, async ({ Runtime }) => {
                // 确保已在通知页
                await this.evaluate(Runtime, `(() => { const a = document.querySelector('a[href="/notification"]'); if (a && !location.pathname.includes('/notification')) a.click(); return true; })();`);
                await this.waitForCondition(Runtime, `location.pathname.includes('/notification')`, 15000, 250);

                const clicked = await this.evaluate(Runtime, `(() => {
                    const userProfile = ${JSON.stringify(userProfile)};
                    const userName = ${JSON.stringify(userName)};
                    const containers = Array.from(document.querySelectorAll('.tabs-content-container .container, .container'));
                    function matches(node) {
                        const a = node.querySelector('.user-info a');
                        if (!a) return false;
                        const href = (a.getAttribute('href') || '').trim();
                        const name = (a.textContent || '').trim();
                        if (userProfile && href.includes(userProfile)) return true;
                        if (userName && name === userName) return true;
                        return false;
                    }
                    const item = containers.find(matches);
                    if (!item) return false;
                    const btn = item.querySelector('.actions .action-reply');
                    if (!btn) return false;
                    btn.click();
                    return true;
                })();`);
                if (!clicked) {
                    return { success: false, error: '未找到目标通知卡片或回复按钮' };
                }

                // 等待输入框出现
                const textareaReady = await this.waitForCondition(Runtime, `document.querySelector('textarea.comment-input')`, 10000, 200);
                if (!textareaReady) {
                    return { success: false, error: '未出现回复输入框' };
                }

                // 填写文本
                await this.evaluate(Runtime, `(() => {
                    const text = ${JSON.stringify(replyText)};
                    const ta = document.querySelector('textarea.comment-input');
                    if (!ta) return false;
                    ta.focus();
                    ta.value = text;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    return true;
                })();`);

                // 点击发送
                const sent = await this.evaluate(Runtime, `(() => {
                    const btn = document.querySelector('button.submit');
                    if (!btn) return false;
                    btn.click();
                    return true;
                })();`);
                if (!sent) {
                    return { success: false, error: '未找到发送按钮' };
                }

                // 等待输入框消失或按钮禁用视作发送完成
                await this.waitForCondition(Runtime, `!document.querySelector('textarea.comment-input') || (document.querySelector('button.submit') && document.querySelector('button.submit').disabled)`, 15000, 250);

                // 快速评论风控检测：出现 “评论过快/等会儿再评/操作过于频繁/请稍后再试” 等提示
                const rateLimited = await this.waitForCondition(
                    Runtime,
                    `(() => {
                        const t = (document.body && document.body.innerText) || '';
                        return /评论过快|等会儿再评|操作过于频繁|请稍后再试/.test(t);
                    })()`,
                    2000,
                    200
                );

                if (rateLimited) {
                    return { success: false, rateLimited: true, error: '评论过快，请稍后再试' };
                }

                return { success: true };
            });
        } catch (error) {
            console.error('replyToXhsComment 失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 发布小红书内容
     */
    async publishXhsContent(accountId, content) {
        const info = this.processes.get(accountId);
        if (!info) {
            return { success: false, error: '未找到浏览器进程，请先启动该账号的浏览器' };
        }
        const port = info.debuggingPort;
        if (!port) {
            return { success: false, error: '该浏览器实例未启用远程调试端口' };
        }

        try {
            await this.waitForDevTools(port, 20000, 250);
            const targetPage = await this.getXhsPageTarget(port);
            const wsTarget = targetPage.webSocketDebuggerUrl || targetPage.id;

            const title = (content && content.title) || '';
            const body = (content && content.body) || (content && content.content) || '';
            const tags = (content && content.tags) || '';
            const images = (content && content.images) || [];

            return await this.withPageClient(port, wsTarget, async ({ Runtime }) => {
                // 导航到发布页面
                await this.evaluate(Runtime, `window.location.href = 'https://creator.xiaohongshu.com/publish/publish?from=menu&target=image';`);
                await this.waitForCondition(Runtime, `location.href.includes('creator.xiaohongshu.com/publish')`, 15000, 250);
                
                // 等待页面加载完成
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // 尝试点击左侧"发布笔记"入口（如存在）
                const entryClicked = await this.evaluate(Runtime, `(() => {
                    const isVisible = (el) => !!(el && el.nodeType === 1 && el.offsetParent !== null);
                    const clickEl = (el) => { try { el.scrollIntoView({ block: 'center' }); el.click(); return true; } catch { return false; } };
                    try {
                        const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"], .btn, .button'));
                        const target = candidates.find(el => isVisible(el) && ((el.textContent || '').trim() === '发布笔记' || (el.getAttribute('aria-label') || '').includes('发布笔记')));
                        if (target) { console.log('Clicked 发布笔记 entry'); return clickEl(target); }
                        const any = Array.from(document.querySelectorAll('*')).find(el => isVisible(el) && (el.textContent || '').trim() === '发布笔记');
                        if (any) { console.log('Clicked 发布笔记 via fallback'); return clickEl(any); }
                        return false;
                    } catch (e) { console.error('Entry click error', e); return false; }
                })();`);
                
                // 等待选项卡区域出现，更加灵活的等待策略
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 添加详细的页面结构调试信息
                console.log('=== 页面结构调试信息 ===');
                const debugInfo = await this.evaluate(Runtime, `(() => {
                    const info = {
                        url: location.href,
                        title: document.title,
                        bodyText: document.body.innerText.substring(0, 300),
                        allCreatorTabs: [],
                        allButtonTexts: [],
                        allSpanTexts: [],
                        allClickableElements: []
                    };

                    // 查找所有 .creator-tab 元素
                    const creatorTabs = Array.from(document.querySelectorAll('.creator-tab'));
                    creatorTabs.forEach((tab, index) => {
                        const titleSpan = tab.querySelector('.title');
                        const titleText = titleSpan ? titleSpan.textContent.trim() : '';
                        const className = tab.className;
                        const isVisible = tab.offsetParent !== null;
                        const underlineEl = tab.querySelector('.underline');
                        const underlineVisible = underlineEl && underlineEl.offsetParent !== null;
                        
                        info.allCreatorTabs.push({
                            index,
                            titleText,
                            className,
                            isVisible,
                            hasUnderline: !!underlineEl,
                            underlineVisible
                        });
                    });

                    // 查找所有可能的按钮和可点击元素
                    const clickableSelectors = ['button', 'a', '[role="button"]', '[role="tab"]', '.creator-tab', 'div[onclick]'];
                    clickableSelectors.forEach(selector => {
                        const elements = Array.from(document.querySelectorAll(selector));
                        elements.forEach(el => {
                            const text = el.textContent.trim();
                            if (text && text.length < 30 && el.offsetParent !== null) {
                                info.allClickableElements.push({
                                    selector,
                                    text,
                                    tagName: el.tagName,
                                    className: el.className
                                });
                            }
                        });
                    });

                    // 查找包含"图文"的所有元素
                    const allElements = Array.from(document.querySelectorAll('*'));
                    const imageTextElements = allElements.filter(el => {
                        const text = (el.textContent || '').trim();
                        return text.includes('图文') && el.offsetParent !== null;
                    });
                    
                    info.imageTextElements = imageTextElements.map(el => ({
                        text: el.textContent.trim(),
                        tagName: el.tagName,
                        className: el.className
                    }));

                    return info;
                })();`);

                console.log('页面调试信息:', JSON.stringify(debugInfo, null, 2));
                
                // 针对具体HTML结构的选项卡切换逻辑
                const tabSwitched = await this.evaluate(Runtime, `(() => {
                    const isVisible = (el) => !!(el && el.nodeType === 1 && el.offsetParent !== null);
                    const clickEl = (el) => {
                        try {
                            el.scrollIntoView({ block: 'center' });
                            // 先尝试普通点击
                            el.click();
                            return true;
                        } catch (_) { 
                            try { 
                                // 如果普通点击失败，尝试模拟鼠标事件
                                const rect = el.getBoundingClientRect();
                                const event = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: rect.left + rect.width / 2,
                                    clientY: rect.top + rect.height / 2
                                });
                                el.dispatchEvent(event);
                                return true; 
                            } catch { return false; } 
                        }
                    };

                    try {
                        console.log('开始寻找上传图文选项卡，基于具体HTML结构...');
                        console.log('当前页面URL:', location.href);
                        
                        // 策略1: 专门查找 .creator-tab 元素
                        const allCreatorTabs = Array.from(document.querySelectorAll('.creator-tab'));
                        const visibleCreatorTabs = allCreatorTabs.filter(isVisible);
                        
                        console.log('页面上所有 .creator-tab 元素数量:', allCreatorTabs.length);
                        console.log('可见的 .creator-tab 元素数量:', visibleCreatorTabs.length);
                        
                        // 输出所有 creator-tab 的详细信息（包括不可见的）
                        allCreatorTabs.forEach((tab, index) => {
                            const titleSpan = tab.querySelector('.title');
                            const titleText = titleSpan ? titleSpan.textContent.trim() : '无标题';
                            const visible = isVisible(tab);
                            console.log(\`creator-tab[\${index}]: 标题="\${titleText}", 类名="\${tab.className}", 可见=\${visible}\`);
                        });
                        
                        // 查找包含"上传图文"的 creator-tab（先在可见的中找，再在所有中找）
                        let imageTab = visibleCreatorTabs.find(tab => {
                            const titleSpan = tab.querySelector('.title');
                            return titleSpan && titleSpan.textContent.trim() === '上传图文';
                        });
                        
                        if (!imageTab) {
                            console.log('在可见元素中未找到，搜索所有元素...');
                            imageTab = allCreatorTabs.find(tab => {
                                const titleSpan = tab.querySelector('.title');
                                return titleSpan && titleSpan.textContent.trim() === '上传图文';
                            });
                        }
                        
                        if (imageTab) {
                            console.log('找到上传图文的 creator-tab，尝试点击容器');
                            if (clickEl(imageTab)) {
                                console.log('成功点击 creator-tab 容器');
                                return true;
                            }
                            
                            // 尝试点击内部的 title span
                            const titleSpan = imageTab.querySelector('.title');
                            if (titleSpan) {
                                console.log('尝试点击内部的 title span');
                                if (clickEl(titleSpan)) {
                                    console.log('成功点击 title span');
                                    return true;
                                }
                            }
                        }
                        
                        // 策略2: 直接查找包含"上传图文"文本的 .title 元素
                        const titleElements = Array.from(document.querySelectorAll('.title')).filter(el => {
                            return isVisible(el) && el.textContent.trim() === '上传图文';
                        });
                        
                        console.log('找到的 .title 元素数量:', titleElements.length);
                        
                        for (const titleEl of titleElements) {
                            console.log('尝试点击 .title 元素');
                            if (clickEl(titleEl)) {
                                console.log('成功点击 .title 元素');
                                return true;
                            }
                            
                            // 尝试点击其父级 creator-tab
                            const parentTab = titleEl.closest('.creator-tab');
                            if (parentTab && isVisible(parentTab)) {
                                console.log('尝试点击父级 .creator-tab');
                                if (clickEl(parentTab)) {
                                    console.log('成功点击父级 .creator-tab');
                                    return true;
                                }
                            }
                        }
                        
                        // 策略3: 更广泛的搜索 - 查找所有包含"上传图文"的元素
                        const allImageTextElements = Array.from(document.querySelectorAll('*')).filter(el => {
                            const text = (el.textContent || '').trim();
                            return text === '上传图文' && isVisible(el);
                        });
                        
                        console.log('找到所有包含"上传图文"的元素:', allImageTextElements.length, '个');
                        
                        for (const el of allImageTextElements) {
                            console.log('尝试点击元素:', el.tagName, el.className);
                            if (clickEl(el)) {
                                console.log('成功点击包含"上传图文"的元素');
                                return true;
                            }
                            
                            // 向上查找可点击的父级容器
                            let parent = el.parentElement;
                            let level = 0;
                            while (parent && parent !== document.body && level < 3) {
                                if (isVisible(parent)) {
                                    console.log(\`尝试点击父级[\${level}]: \${parent.tagName}, \${parent.className}\`);
                                    if (clickEl(parent)) {
                                        console.log(\`成功点击父级[\${level}]\`);
                                        return true;
                                    }
                                }
                                parent = parent.parentElement;
                                level++;
                            }
                        }
                        
                        // 策略4: 基于文本内容的更宽松搜索
                        console.log('尝试策略4: 更宽松的文本搜索...');
                        const looserTextElements = Array.from(document.querySelectorAll('*')).filter(el => {
                            const text = (el.textContent || '').trim();
                            return (text.includes('图文') || text.includes('上传图文')) && el.offsetParent !== null;
                        });
                        
                        console.log('找到包含"图文"的元素:', looserTextElements.length, '个');
                        looserTextElements.forEach(el => {
                            console.log('图文元素:', el.tagName, '"' + el.textContent.trim() + '"', el.className);
                        });
                        
                        for (const el of looserTextElements) {
                            if (el.textContent.trim() === '上传图文') {
                                console.log('尝试点击精确匹配的"上传图文"元素');
                                if (clickEl(el)) {
                                    console.log('成功点击精确匹配元素');
                                    return true;
                                }
                            }
                        }
                        
                        // 策略5: 使用XPath查找
                        console.log('尝试策略5: 使用XPath查找...');
                        try {
                            const xpathResults = document.evaluate(
                                "//span[contains(text(), '上传图文')] | //div[contains(text(), '上传图文')] | //*[text()='上传图文']",
                                document,
                                null,
                                XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                                null
                            );
                            
                            let xpathNode;
                            const xpathElements = [];
                            while (xpathNode = xpathResults.iterateNext()) {
                                if (xpathNode.offsetParent !== null) {
                                    xpathElements.push(xpathNode);
                                }
                            }
                            
                            console.log('XPath找到的元素数量:', xpathElements.length);
                            
                            for (const el of xpathElements) {
                                console.log('尝试点击XPath元素:', el.tagName, el.textContent.trim(), el.className);
                                if (clickEl(el)) {
                                    console.log('成功点击XPath元素');
                                    return true;
                                }
                            }
                        } catch (e) {
                            console.log('XPath查找失败:', e.message);
                        }
                        
                        // 策略6: 基于role属性查找选项卡
                        console.log('尝试策略6: 查找role="tab"元素...');
                        const tabElements = Array.from(document.querySelectorAll('[role="tab"]')).filter(isVisible);
                        console.log('找到role="tab"元素:', tabElements.length, '个');
                        
                        for (const tab of tabElements) {
                            const text = tab.textContent.trim();
                            console.log('检查role="tab"元素:', text, tab.className);
                            if (text.includes('图文') || text.includes('上传')) {
                                console.log('尝试点击role="tab"元素');
                                if (clickEl(tab)) {
                                    console.log('成功点击role="tab"元素');
                                    return true;
                                }
                            }
                        }
                        
                        console.log('所有策略都失败了');
                        return false;
                        
                    } catch (e) {
                        console.error('Tab switching error:', e);
                        return false;
                    }
                })();`);

                // 如果第一次失败，等待后重试
                if (!tabSwitched) {
                    console.log('第一次切换失败，等待3秒后重试...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    const retryResult = await this.evaluate(Runtime, `(() => {
                        const isVisible = (el) => !!(el && el.nodeType === 1 && el.offsetParent !== null);
                        const clickEl = (el) => { try { el.scrollIntoView({ block: 'center' }); el.click(); return true; } catch { return false; } };
                        
                        console.log('重试查找上传图文选项卡，基于具体HTML结构...');
                        
                        // 重试策略1: 专门查找 .creator-tab 元素
                        const creatorTabs = Array.from(document.querySelectorAll('.creator-tab')).filter(isVisible);
                        console.log('重试找到的 .creator-tab 元素数量:', creatorTabs.length);
                        
                        for (const tab of creatorTabs) {
                            const titleSpan = tab.querySelector('.title');
                            if (titleSpan) {
                                const titleText = titleSpan.textContent.trim();
                                console.log('重试检查选项卡:', titleText);
                                
                                if (titleText === '上传图文') {
                                    console.log('重试找到上传图文选项卡，尝试点击');
                                    if (clickEl(tab)) {
                                        console.log('重试点击容器成功');
                                        return true;
                                    }
                                    if (clickEl(titleSpan)) {
                                        console.log('重试点击标题成功');
                                        return true;
                                    }
                                }
                            }
                        }
                        
                        // 重试策略2: 查找所有包含"上传图文"的元素
                        const allTextElements = Array.from(document.querySelectorAll('*')).filter(el => {
                            const text = (el.textContent || '').trim();
                            return text === '上传图文' && isVisible(el);
                        });
                        
                        console.log('重试找到包含"上传图文"的元素:', allTextElements.length, '个');
                        
                        for (const el of allTextElements) {
                            console.log('重试点击:', el.tagName, el.className);
                            if (clickEl(el)) {
                                console.log('重试点击成功');
                                return true;
                            }
                            
                            // 尝试点击最近的可点击父级
                            const clickableParent = el.closest('.creator-tab, button, a, [onclick], [role="tab"]');
                            if (clickableParent && isVisible(clickableParent)) {
                                console.log('重试点击可点击父级:', clickableParent.tagName, clickableParent.className);
                                if (clickEl(clickableParent)) {
                                    console.log('重试通过父级成功');
                                    return true;
                                }
                            }
                        }
                        
                        console.log('重试也失败了');
                        return false;
                    })();`);
                    
                    if (!retryResult) {
                        // 最后的诊断信息
                        console.log('=== 最终诊断信息 ===');
                        const finalDiagnosis = await this.evaluate(Runtime, `(() => {
                            const diagnosis = {
                                currentUrl: location.href,
                                pageTitle: document.title,
                                bodyText: document.body.innerText.substring(0, 500),
                                allVisibleText: [],
                                allButtonsAndLinks: [],
                                pageStructure: {
                                    hasCreatorTabs: document.querySelectorAll('.creator-tab').length,
                                    hasRoleTabs: document.querySelectorAll('[role="tab"]').length,
                                    hasButtons: document.querySelectorAll('button').length,
                                    hasLinks: document.querySelectorAll('a').length
                                }
                            };
                            
                            // 收集所有可见文本
                            const textElements = Array.from(document.querySelectorAll('span, div, p, button, a'));
                            textElements.forEach(el => {
                                const text = el.textContent.trim();
                                if (text && text.length < 50 && el.offsetParent !== null) {
                                    diagnosis.allVisibleText.push(text);
                                }
                            });
                            
                            // 收集所有按钮和链接
                            const clickableElements = Array.from(document.querySelectorAll('button, a'));
                            clickableElements.forEach(el => {
                                const text = el.textContent.trim();
                                if (text && el.offsetParent !== null) {
                                    diagnosis.allButtonsAndLinks.push({
                                        text,
                                        tagName: el.tagName,
                                        className: el.className
                                    });
                                }
                            });
                            
                            return diagnosis;
                        })();`);
                        
                        console.log('最终诊断结果:', JSON.stringify(finalDiagnosis, null, 2));
                        
                        throw new Error(`无法切换到"上传图文"选项卡。页面诊断信息：
URL: ${finalDiagnosis.currentUrl}
页面标题: ${finalDiagnosis.pageTitle}
.creator-tab元素数量: ${finalDiagnosis.pageStructure.hasCreatorTabs}
role="tab"元素数量: ${finalDiagnosis.pageStructure.hasRoleTabs}
按钮数量: ${finalDiagnosis.pageStructure.hasButtons}
可见文本: ${finalDiagnosis.allVisibleText.slice(0, 10).join(', ')}
请检查页面是否正确加载或结构是否发生变化。`);
                    }
                }

                // 验证是否成功切换到上传图文选项卡
                console.log('验证是否成功切换到上传图文选项卡...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const switchVerified = await this.evaluate(Runtime, `(() => {
                    try {
                        console.log('开始验证是否成功切换到上传图文选项卡...');
                        
                        // 策略1: 检查"上传图文"的 creator-tab 是否有选中状态
                        const creatorTabs = Array.from(document.querySelectorAll('.creator-tab'));
                        const imageTab = creatorTabs.find(tab => {
                            const titleSpan = tab.querySelector('.title');
                            return titleSpan && titleSpan.textContent.trim() === '上传图文';
                        });
                        
                        if (imageTab) {
                            console.log('找到上传图文选项卡，检查选中状态...');
                            
                            // 检查是否有活跃状态的CSS类
                            const className = (imageTab.className || '').toString();
                            const hasActiveClass = className && (
                                className.includes('active') || 
                                className.includes('selected') || 
                                className.includes('current') ||
                                className.includes('actived')
                            );
                            
                            // 检查下划线是否可见（选中状态通常会显示下划线）
                            const underlineEl = imageTab.querySelector('.underline');
                            const underlineVisible = underlineEl && (
                                underlineEl.offsetParent !== null || 
                                getComputedStyle(underlineEl).display !== 'none'
                            );
                            
                            // 检查文本颜色是否为红色或特殊颜色（选中状态）
                            const titleSpan = imageTab.querySelector('.title');
                            const hasActiveColor = titleSpan && (
                                getComputedStyle(titleSpan).color.includes('255, 65, 65') || // 红色
                                getComputedStyle(titleSpan).color.includes('rgb(255, 65, 65)') ||
                                getComputedStyle(titleSpan).color.includes('#ff4141') ||
                                getComputedStyle(titleSpan).color.includes('red')
                            );
                            
                            console.log('选中状态检查结果:');
                            console.log('- CSS类包含active等:', hasActiveClass);
                            console.log('- 下划线可见:', underlineVisible);
                            console.log('- 文本颜色为红色:', hasActiveColor);
                            console.log('- 元素类名:', imageTab.className);
                            if (titleSpan) {
                                console.log('- 标题文本颜色:', getComputedStyle(titleSpan).color);
                            }
                            
                            if (hasActiveClass || underlineVisible || hasActiveColor) {
                                console.log('验证成功：上传图文选项卡已选中');
                                return true;
                            }
                        }
                        
                        // 策略2: 检查页面内容变化
                        const bodyText = document.body.innerText;
                        const hasUploadHint = !bodyText.includes('请先切换到图片tab');
                        const hasFileInput = document.querySelector('input[type="file"]') !== null;
                        const hasUploadArea = bodyText.includes('点击上传') || bodyText.includes('拖拽上传') || bodyText.includes('选择文件');
                        
                        console.log('页面内容检查:');
                        console.log('- 不包含"请先切换到图片tab"提示:', hasUploadHint);
                        console.log('- 存在文件输入框:', hasFileInput);
                        console.log('- 存在上传区域提示:', hasUploadArea);
                        
                        if (hasUploadHint || hasFileInput || hasUploadArea) {
                            console.log('验证成功：页面内容表明已切换到图文上传');
                            return true;
                        }
                        
                        // 策略3: 检查URL变化
                        const currentUrl = location.href;
                        const urlChanged = currentUrl.includes('image') || currentUrl.includes('photo') || currentUrl.includes('publish');
                        console.log('- URL是否变化:', urlChanged, '当前URL:', currentUrl);
                        
                        if (urlChanged) {
                            console.log('验证成功：URL变化表明已切换');
                            return true;
                        }
                        
                        console.log('验证失败：所有检查都未通过');
                        return false;
                        
                    } catch (e) {
                        console.error('验证切换状态失败:', e);
                        return false;
                    }
                })();`);

                if (!switchVerified) {
                    throw new Error('切换到上传图文选项卡后验证失败，可能切换未成功');
                }
                
                console.log('成功切换到上传图文选项卡');

                // 等待文件输入框出现
                console.log('等待文件输入框出现...');
                try {
                    await this.waitForCondition(
                        Runtime,
                        `document.querySelector('input[type="file"]') || document.querySelector('[accept*="image"]')`,
                        10000,
                        500
                    );
                } catch (e) {
                    throw new Error('切换选项卡后未找到文件上传输入框，请检查页面结构');
                }

                // 上传图片
                if (images && images.length > 0) {
                    const uploadResult = await this.evaluate(Runtime, `(async () => {
                        const images = ${JSON.stringify(images)};
                        
                        const fileInput = document.querySelector('input[type="file"]') || 
                                         document.querySelector('[accept*="image"]') ||
                                         document.querySelector('input[accept*="png"], input[accept*="jpg"], input[accept*="jpeg"]');
                        if (!fileInput) return false;
                        
                        const files = [];
                        for (let i = 0; i < images.length; i++) {
                            const img = images[i];
                            const dataUrl = typeof img === 'string' ? img : (img.url || '');
                            
                            if (dataUrl.startsWith('data:image')) {
                                try {
                                    const response = await fetch(dataUrl);
                                    const blob = await response.blob();
                                    const ext = dataUrl.match(/^data:image\\/(\\w+);base64,/)?.[1] || 'png';
                                    const fileName = \`image_\${i + 1}.\${ext}\`;
                                    const file = new File([blob], fileName, { type: blob.type });
                                    files.push(file);
                                } catch (e) {
                                    console.error('处理图片失败:', e);
                                }
                            }
                        }
                        
                        if (files.length > 0) {
                            const dt = new DataTransfer();
                            files.forEach(file => dt.items.add(file));
                            fileInput.files = dt.files;
                            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                        return false;
                    })();`);

                    if (uploadResult) {
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }

                // 点击"下一步"
                const nextClicked = await this.evaluate(Runtime, `(() => {
                    const isVisible = (el) => !!(el && el.nodeType === 1 && el.offsetParent !== null);
                    const clickEl = (el) => { try { el.scrollIntoView({ block: 'center' }); el.click(); return true; } catch { return false; } };
                    try {
                        const candidates = Array.from(document.querySelectorAll('button, a[role="button"], div[role="button"], div.btn, .btn, .button'));
                        const target = candidates.find(el => isVisible(el) && (el.textContent || '').trim().includes('下一步'));
                        if (target) { console.log('Clicked 下一步'); return clickEl(target); }
                        return false;
                    } catch (e) { console.error('Next click error', e); return false; }
                })();`);

                // 等待编辑器出现
                await this.waitForCondition(
                    Runtime,
                    `document.querySelector('input[placeholder*="标题"], textarea[placeholder*="标题"], input[maxlength="20"]') || document.querySelector('div[contenteditable="true"]')`,
                    8000,
                    200
                );

                // 填写标题
                if (title) {
                    await this.evaluate(Runtime, `(() => {
                        const titleText = ${JSON.stringify(title)};
                        const selectors = ['input[placeholder*="标题"]', 'textarea[placeholder*="标题"]', 'input[maxlength="20"]'];
                        for (const selector of selectors) {
                            const el = document.querySelector(selector);
                            if (el) {
                                el.focus();
                                el.value = titleText;
                                el.dispatchEvent(new Event('input', {bubbles: true}));
                                return true;
                            }
                        }
                        return false;
                    })();`);
                }

                // 填写正文
                if (body) {
                    await this.evaluate(Runtime, `(() => {
                        const bodyText = ${JSON.stringify(body)};
                        const editor = document.querySelector('div[contenteditable="true"]');
                        if (editor) {
                            editor.focus();
                            editor.innerHTML = bodyText.split('\\n').map(line => \`<p>\${line || '<br>'}</p>\`).join('');
                            editor.dispatchEvent(new Event('input', {bubbles: true}));
                            return true;
                        }
                        return false;
                    })();`);
                }

                // 添加标签
                if (tags) {
                    await this.evaluate(Runtime, `(async () => {
                        const tagsText = ${JSON.stringify(tags)};
                        const tagArray = tagsText.split(/[，,]/).map(t => t.trim()).filter(t => t);
                        if (tagArray.length === 0) return true;
                        
                        const editor = document.querySelector('div[contenteditable="true"]');
                        if (!editor) return false;
                        
                        // 清理编辑器末尾的连续空行
                        const cleanEditor = () => {
                            let html = editor.innerHTML;
                            // 移除末尾的空段落和换行
                            html = html.replace(/(<p><br><\\/p>|<p><\\/p>|<br>)+$/, '');
                            // 确保有一个空段落用于添加标签
                            if (!html.endsWith('</p>')) {
                                html += '<p><br></p>';
                            }
                            editor.innerHTML = html;
                        };
                        
                        cleanEditor();
                        editor.focus();
                        
                        // 移动光标到编辑器末尾
                        const range = document.createRange();
                        const selection = window.getSelection();
                        range.selectNodeContents(editor);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        for (let i = 0; i < tagArray.length; i++) {
                            const tag = tagArray[i];
                            const tagWithHash = tag.startsWith('#') ? tag : \`#\${tag}\`;
                            
                            console.log(\`开始添加标签 \${i+1}/\${tagArray.length}: \${tagWithHash}\`);
                            
                            // 方法1：直接插入文本节点
                            let textInserted = false;
                            try {
                                const selection = window.getSelection();
                                const range = selection.getRangeAt(0);
                                
                                // 删除当前选区内容
                                range.deleteContents();
                                
                                // 创建文本节点并插入
                                const textNode = document.createTextNode(tagWithHash);
                                range.insertNode(textNode);
                                
                                // 移动光标到文本末尾
                                range.setStartAfter(textNode);
                                range.setEndAfter(textNode);
                                selection.removeAllRanges();
                                selection.addRange(range);
                                
                                // 触发输入事件
                                editor.dispatchEvent(new Event('input', {bubbles: true}));
                                editor.dispatchEvent(new Event('change', {bubbles: true}));
                                
                                textInserted = true;
                                console.log('使用文本节点插入方法成功');
                            } catch (e) {
                                console.log('文本节点插入失败，尝试备用方法:', e);
                            }
                            
                            // 方法2：如果方法1失败，使用模拟打字
                            if (!textInserted) {
                                try {
                                    // 逐字符模拟输入
                                    for (let char of tagWithHash) {
                                        const inputEvent = new InputEvent('input', {
                                            inputType: 'insertText',
                                            data: char,
                                            bubbles: true,
                                            cancelable: true
                                        });
                                        editor.dispatchEvent(inputEvent);
                                        await new Promise(resolve => setTimeout(resolve, 50)); // 每个字符间隔50ms
                                    }
                                    console.log('使用模拟打字方法成功');
                                } catch (e) {
                                    console.log('模拟打字也失败了:', e);
                                }
                            }
                            
                            // 等待标签推荐菜单出现
                            let menuAppeared = false;
                            let attempts = 0;
                            const maxAttempts = 20; // 最多等待4秒
                            
                            while (!menuAppeared && attempts < maxAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 200));
                                attempts++;
                                
                                // 检查是否有推荐菜单出现
                                const menu = document.querySelector('.mention-dropdown, .tag-dropdown, [class*="dropdown"], [class*="menu"], [class*="suggestion"]');
                                if (menu && menu.offsetHeight > 0) {
                                    menuAppeared = true;
                                    console.log(\`标签推荐菜单已出现，等待时间: \${attempts * 200}ms\`);
                                }
                            }
                            
                            if (!menuAppeared) {
                                console.log(\`标签推荐菜单未出现，直接确认标签: \${tagWithHash}\`);
                            }
                            
                            // 等待额外时间确保菜单稳定
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            // 按回车确认标签
                            const enterEvent = new KeyboardEvent('keydown', {
                                key: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true,
                                cancelable: true
                            });
                            editor.dispatchEvent(enterEvent);
                            
                            // 也触发keyup事件
                            const enterUpEvent = new KeyboardEvent('keyup', {
                                key: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true,
                                cancelable: true
                            });
                            editor.dispatchEvent(enterUpEvent);
                            
                            // 等待标签确认完成
                            await new Promise(resolve => setTimeout(resolve, 800));
                            
                            console.log(\`标签 \${tagWithHash} 添加完成\`);
                        }
                        
                        console.log('所有标签添加完成');
                        return true;
                    })();`);
                }

                // 等待内容填写完成
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 点击最终发布按钮
                const published = await this.evaluate(Runtime, `(() => {
                    try {
                        console.log('=== 开始查找发布按钮 ===');
                        
                        // 方法1：根据最新的发布按钮结构查找
                        console.log('方法1：查找 div.d-button-content span.d-text');
                        let target = document.querySelector('div.d-button-content span.d-text');
                        console.log('找到的span元素:', target);
                        if (target) {
                            console.log('span元素文本内容:', target.textContent);
                            console.log('span元素trim后:', target.textContent ? target.textContent.trim() : 'null');
                            console.log('是否包含"发布":', target.textContent && target.textContent.trim().includes('发布'));
                        }
                        
                        if (target && target.textContent && target.textContent.trim().includes('发布')) {
                            console.log('找到包含发布文本的span，开始向上查找可点击父元素');
                            // 找到包含发布文本的span，向上查找可点击的父元素
                            let clickableParent = target;
                            let level = 0;
                            while (clickableParent && clickableParent !== document.body) {
                                console.log(\`第\${level}层父元素:\`, clickableParent.tagName, clickableParent.className, clickableParent);
                                console.log(\`  - 是否为BUTTON:\`, clickableParent.tagName === 'BUTTON');
                                console.log(\`  - role属性:\`, clickableParent.getAttribute('role'));
                                console.log(\`  - 是否有d-button类:\`, clickableParent.classList.contains('d-button'));
                                console.log(\`  - 是否有onclick:\`, !!clickableParent.onclick);
                                console.log(\`  - cursor样式:\`, clickableParent.style.cursor);
                                
                                if (clickableParent.tagName === 'BUTTON' || 
                                    clickableParent.getAttribute('role') === 'button' ||
                                    clickableParent.classList.contains('d-button') ||
                                    clickableParent.onclick ||
                                    clickableParent.style.cursor === 'pointer') {
                                    const isVisible = clickableParent.offsetParent !== null;
                                    const isEnabled = !clickableParent.disabled && clickableParent.getAttribute('aria-disabled') !== 'true';
                                    console.log(\`  - 元素可见性:\`, isVisible);
                                    console.log(\`  - 元素禁用状态:\`, clickableParent.disabled);
                                    console.log(\`  - aria-disabled:\`, clickableParent.getAttribute('aria-disabled'));
                                    console.log(\`  - 元素可用性:\`, isEnabled);
                                    
                                    if (isVisible && isEnabled) {
                                        console.log('找到发布按钮（方法1）:', clickableParent);
                                        clickableParent.scrollIntoView({block: 'center'});
                                        clickableParent.click();
                                        return true;
                                    } else {
                                        console.log('元素不可见或被禁用，继续向上查找');
                                    }
                                }
                                clickableParent = clickableParent.parentElement;
                                level++;
                                if (level > 10) {
                                    console.log('向上查找超过10层，停止查找');
                                    break;
                                }
                            }
                        }
                        
                        console.log('方法1失败，尝试方法2');
                        // 方法2：传统方式查找（备用）
                        console.log('方法2：查找传统按钮选择器');
                        const candidates = Array.from(document.querySelectorAll('button, div.btn, div[role="button"], div.d-button'));
                        console.log(\`找到\${candidates.length}个候选按钮:\`, candidates);
                        
                        candidates.forEach((el, index) => {
                            const text = (el.textContent || '').trim();
                            const isVisible = el.offsetParent !== null;
                            const isEnabled = !el.disabled && el.getAttribute('aria-disabled') !== 'true';
                            console.log(\`候选按钮\${index}:\`, el);
                            console.log(\`  - 文本内容: "\${text}"\`);
                            console.log(\`  - 可见性: \${isVisible}\`);
                            console.log(\`  - 可用性: \${isEnabled}\`);
                            console.log(\`  - 包含"发布": \${text.includes('发布')}\`);
                            console.log(\`  - 包含"发布笔记": \${text.includes('发布笔记')}\`);
                        });
                        
                        // 改进的按钮选择逻辑：优先选择真正的发布按钮
                        target = candidates.find(el => {
                            const text = (el.textContent || '').trim();
                            const isVisible = el.offsetParent !== null;
                            const isEnabled = !el.disabled && el.getAttribute('aria-disabled') !== 'true';
                            const className = el.className || '';
                            
                            // 第一优先级：有publishBtn类名且文本是"发布"的按钮
                            if (isVisible && isEnabled && className.includes('publishBtn') && text === '发布') {
                                console.log('找到最高优先级发布按钮（publishBtn + "发布"）:', el);
                                return true;
                            }
                            return false;
                        });
                        
                        // 如果没找到最高优先级的，再找次优先级的
                        if (!target) {
                            target = candidates.find(el => {
                                const text = (el.textContent || '').trim();
                                const isVisible = el.offsetParent !== null;
                                const isEnabled = !el.disabled && el.getAttribute('aria-disabled') !== 'true';
                                const className = el.className || '';
                                
                                // 第二优先级：有publishBtn类名的按钮
                                if (isVisible && isEnabled && className.includes('publishBtn')) {
                                    console.log('找到次优先级发布按钮（publishBtn类名）:', el);
                                    return true;
                                }
                                return false;
                            });
                        }
                        
                        // 如果还没找到，再找精确匹配"发布"的按钮
                        if (!target) {
                            target = candidates.find(el => {
                                const text = (el.textContent || '').trim();
                                const isVisible = el.offsetParent !== null;
                                const isEnabled = !el.disabled && el.getAttribute('aria-disabled') !== 'true';
                                
                                // 第三优先级：精确匹配"发布"文本（排除"发布笔记"等）
                                if (isVisible && isEnabled && text === '发布') {
                                    console.log('找到第三优先级发布按钮（精确匹配"发布"）:', el);
                                    return true;
                                }
                                return false;
                            });
                        }
                        
                        // 最后才考虑包含"发布"的其他按钮，但要排除明显的辅助功能
                        if (!target) {
                            target = candidates.find(el => {
                                const text = (el.textContent || '').trim();
                                const isVisible = el.offsetParent !== null;
                                const isEnabled = !el.disabled && el.getAttribute('aria-disabled') !== 'true';
                                
                                // 第四优先级：包含"发布"但排除辅助功能按钮
                                if (isVisible && isEnabled && text.includes('发布')) {
                                    // 排除这些辅助功能按钮
                                    if (text.includes('发布笔记') || text.includes('发布设置') || 
                                        text.includes('发布时间') || text.includes('发布范围')) {
                                        console.log('跳过辅助功能按钮:', text, el);
                                        return false;
                                    }
                                    console.log('找到第四优先级发布按钮（包含"发布"）:', el);
                                    return true;
                                }
                                return false;
                            });
                        }
                        
                        if (target) {
                            console.log('找到发布按钮（方法2）:', target);
                            target.scrollIntoView({block: 'center'});
                            target.click();
                            return true;
                        }
                        
                        console.log('方法2失败，尝试方法3');
                        console.log('未找到发布按钮，尝试所有包含"发布"文本的元素');
                        // 方法3：查找所有包含"发布"文本的可点击元素
                        const allElements = Array.from(document.querySelectorAll('*'));
                        const publishElements = allElements.filter(el => {
                            const text = (el.textContent || '').trim();
                            return text.includes('发布') && el.offsetParent !== null;
                        });
                        
                        console.log(\`找到\${publishElements.length}个包含"发布"文本的可见元素:\`);
                        publishElements.forEach((el, index) => {
                            console.log(\`发布元素\${index}:\`, el.tagName, el.className, '文本:', el.textContent.trim());
                        });
                        
                        for (let el of publishElements) {
                            const text = (el.textContent || '').trim();
                            console.log('尝试点击元素:', el, '文本:', text);
                            el.scrollIntoView({block: 'center'});
                            el.click();
                            return true;
                        }
                        
                        console.log('=== 所有方法都失败，未找到发布按钮 ===');
                        // 输出页面上所有可能的按钮信息用于调试
                        console.log('页面上所有按钮元素:');
                        const allButtons = Array.from(document.querySelectorAll('button, [role="button"], .btn, .d-button, div[onclick], span[onclick]'));
                        allButtons.forEach((btn, i) => {
                            console.log(\`按钮\${i}:\`, btn.tagName, btn.className, '文本:', (btn.textContent || '').trim().substring(0, 50));
                        });
                        
                        return false;
                    } catch (e) {
                        console.error('发布按钮点击失败:', e);
                        return false;
                    }
                })();`);

                if (!published) {
                    return { success: false, error: '未找到发布按钮或按钮不可点击' };
                }

                console.log('发布按钮点击成功，开始验证发布状态...');

                // 验证发布是否成功完成
                const publishResult = await this.evaluate(Runtime, `(() => {
                    return new Promise((resolve) => {
                        let attempts = 0;
                        const maxAttempts = 20; // 最多检查20次，每次间隔500ms，总共10秒
                        
                        const checkPublishStatus = () => {
                            attempts++;
                            console.log(\`第\${attempts}次检查发布状态...\`);
                            
                            // 检查是否出现发布成功的提示
                            const successIndicators = [
                                // 查找成功提示文本
                                document.querySelector('[class*="success"], [class*="Success"]'),
                                document.querySelector('[class*="toast"], [class*="Toast"]'),
                                document.querySelector('[class*="message"], [class*="Message"]'),
                                // 查找包含成功信息的文本
                                ...Array.from(document.querySelectorAll('*')).filter(el => {
                                    const text = (el.textContent || '').trim();
                                    return text.includes('发布成功') || text.includes('发布完成') || 
                                           text.includes('笔记已发布') || text.includes('已发布');
                                })
                            ].filter(Boolean);
                            
                            if (successIndicators.length > 0) {
                                console.log('检测到发布成功提示:', successIndicators);
                                resolve({ success: true, message: '发布成功', indicators: successIndicators.length });
                                return;
                            }
                            
                            // 检查是否出现错误提示
                            const errorIndicators = [
                                document.querySelector('[class*="error"], [class*="Error"]'),
                                document.querySelector('[class*="fail"], [class*="Fail"]'),
                                ...Array.from(document.querySelectorAll('*')).filter(el => {
                                    const text = (el.textContent || '').trim();
                                    return text.includes('发布失败') || text.includes('发布错误') || 
                                           text.includes('网络错误') || text.includes('系统错误');
                                })
                            ].filter(Boolean);
                            
                            if (errorIndicators.length > 0) {
                                console.log('检测到发布失败提示:', errorIndicators);
                                resolve({ success: false, message: '发布失败', error: '检测到错误提示' });
                                return;
                            }
                            
                            // 检查页面是否跳转到发布成功页面
                            const currentUrl = window.location.href;
                            if (currentUrl.includes('/success') || currentUrl.includes('/published') || 
                                currentUrl !== window.location.href) {
                                console.log('检测到页面跳转，可能发布成功:', currentUrl);
                                resolve({ success: true, message: '页面跳转，发布可能成功', url: currentUrl });
                                return;
                            }
                            
                            // 检查发布按钮状态变化
                            const publishButtons = Array.from(document.querySelectorAll('button, div.btn, [class*="publish"]'));
                            const activePublishBtn = publishButtons.find(btn => {
                                const text = (btn.textContent || '').trim();
                                return text.includes('发布') && btn.offsetParent !== null;
                            });
                            
                            if (!activePublishBtn || activePublishBtn.disabled || 
                                activePublishBtn.getAttribute('aria-disabled') === 'true') {
                                console.log('发布按钮已禁用，可能发布中或已完成');
                            }
                            
                            // 继续检查
                            if (attempts < maxAttempts) {
                                setTimeout(checkPublishStatus, 500);
                            } else {
                                console.log('达到最大检查次数，无法确认发布状态');
                                resolve({ 
                                    success: false, 
                                    message: '发布状态验证超时，无法确认是否发布成功',
                                    timeout: true
                                });
                            }
                        };
                        
                        // 开始检查
                        checkPublishStatus();
                    });
                })();`);

                console.log('发布状态检查结果:', publishResult);

                if (publishResult.success) {
                    console.log('发布成功，准备自动关闭浏览器...');
                    // 发布成功后自动关闭浏览器
                    setTimeout(async () => {
                        try {
                            console.log('执行自动关闭浏览器...');
                            const closeResult = await this.closeBrowser(accountId);
                            console.log('自动关闭浏览器结果:', closeResult);
                        } catch (error) {
                            console.error('自动关闭浏览器失败:', error);
                        }
                    }, 1000); // 延迟1秒关闭，确保发布流程完全完成
                    
                    return { success: true, message: publishResult.message || '发布成功' };
                } else if (publishResult.timeout) {
                    // 超时情况下，我们认为发布可能成功了，但无法确认
                    console.log('发布状态超时，但可能成功，准备自动关闭浏览器...');
                    // 超时但可能成功的情况下也关闭浏览器
                    setTimeout(async () => {
                        try {
                            console.log('执行自动关闭浏览器（超时情况）...');
                            const closeResult = await this.closeBrowser(accountId);
                            console.log('自动关闭浏览器结果:', closeResult);
                        } catch (error) {
                            console.error('自动关闭浏览器失败:', error);
                        }
                    }, 1000);
                    
                    return { 
                        success: true, 
                        message: '发布按钮已点击，但无法确认最终状态。请手动检查发布是否成功。',
                        warning: '状态验证超时'
                    };
                } else {
                    return { success: false, error: publishResult.message || '发布验证失败' };
                }
            });
        } catch (error) {
            console.error('publishXhsContent 失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 构建窗口配置
     */
    buildWindowConfig(account, windowIndex = 0) {
        const width = 1200;
        const height = 800;
        
        // 智能窗口定位：避免窗口重叠
        const offsetX = (windowIndex % 3) * 50;
        const offsetY = Math.floor(windowIndex / 3) * 50;
        
        const left = Math.max(0, 100 + offsetX);
        const top = Math.max(0, 100 + offsetY);
        
        return { width, height, left, top };
    }

    /**
     * 关闭浏览器实例 - 改进版本，能够真正终止Chrome进程
     */
    async closeBrowser(accountId) {
        console.log(`尝试关闭浏览器，账号ID: ${accountId}`);
        console.log(`当前进程映射表:`, Array.from(this.processes.keys()));
        
        const processInfo = this.processes.get(accountId);
        if (!processInfo) {
            console.warn(`进程记录不存在，账号ID: ${accountId}`);
            console.log(`可用的进程记录:`, Array.from(this.processes.entries()).map(([id, info]) => ({
                accountId: id,
                pid: info.pid,
                windowName: info.windowName,
                startTime: info.startTime
            })));
            
            // 尝试通过用户数据目录查找并关闭相关Chrome进程
            const killed = await this.killChromeByUserDataDir(accountId);
            
            return { 
                success: true, 
                message: killed > 0 ? 
                    `通过用户数据目录清理了 ${killed} 个Chrome进程` : 
                    '浏览器进程不存在或已关闭' 
            };
        }

        try {
            console.log(`正在关闭进程 PID: ${processInfo.pid}`);
            
            // 方法1: 尝试优雅关闭主进程
            let mainProcessExists = false;
            try {
                process.kill(processInfo.pid, 0); // 发送信号0只是检查进程是否存在
                console.log(`主进程 ${processInfo.pid} 存在，尝试优雅关闭`);
                process.kill(processInfo.pid, 'SIGTERM');
                mainProcessExists = true;
            } catch (checkError) {
                console.log(`主进程 ${processInfo.pid} 已不存在`);
            }
            
            // 等待一下看主进程是否能优雅退出
            if (mainProcessExists) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // 方法2: 通过用户数据目录查找并强制终止所有相关Chrome进程
            const killedCount = await this.killChromeByUserDataDir(accountId);
            console.log(`通过用户数据目录终止了 ${killedCount} 个Chrome进程`);
            
            // 方法3: 如果还有残留，使用taskkill强制终止
            if (mainProcessExists) {
                try {
                    const { spawn } = require('child_process');
                    await new Promise((resolve, reject) => {
                        const taskkill = spawn('taskkill', ['/F', '/PID', processInfo.pid.toString()], {
                            stdio: 'ignore'
                        });
                        taskkill.on('close', () => resolve());
                        taskkill.on('error', () => resolve()); // 即使失败也继续
                        setTimeout(() => resolve(), 3000); // 3秒超时
                    });
                    console.log(`强制终止主进程 ${processInfo.pid} 完成`);
                } catch (taskkillError) {
                    console.log(`taskkill执行出错:`, taskkillError.message);
                }
            }
            
            // 清理进程记录
            this.processes.delete(accountId);
            
            const totalKilled = killedCount + (mainProcessExists ? 1 : 0);
            return { 
                success: true, 
                message: `浏览器已关闭，终止了 ${totalKilled} 个进程` 
            };
        } catch (error) {
            console.error('关闭浏览器进程失败:', error);
            
            // 即使出错，也尝试通过用户数据目录清理
            try {
                const killedCount = await this.killChromeByUserDataDir(accountId);
                this.processes.delete(accountId);
                
                if (killedCount > 0) {
                    return {
                        success: true,
                        message: `虽然主进程关闭失败，但通过用户数据目录清理了 ${killedCount} 个Chrome进程`
                    };
                }
            } catch (cleanupError) {
                console.error('清理过程也失败:', cleanupError);
            }
            
            // 最后的清理
            this.processes.delete(accountId);
            
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    /**
     * 通过用户数据目录查找并终止相关的Chrome进程
     */
    async killChromeByUserDataDir(accountId) {
        const { spawn } = require('child_process');
        const path = require('path');
        
        try {
            console.log(`查找包含 "${accountId}" 的Chrome进程...`);
            
            // 方法1: 使用tasklist查找Chrome进程
            const pids = await this.findChromeProcessesByAccountId(accountId);
            
            if (pids.length === 0) {
                console.log('未找到相关的Chrome进程');
                return 0;
            }
            
            console.log(`找到 ${pids.length} 个相关Chrome进程:`, pids);
            
            // 逐个终止进程
            let killedCount = 0;
            for (const pid of pids) {
                try {
                    await new Promise((resolve) => {
                        const taskkill = spawn('taskkill', ['/F', '/PID', pid.toString()], {
                            stdio: 'ignore'
                        });
                        taskkill.on('close', (code) => {
                            if (code === 0) {
                                killedCount++;
                                console.log(`成功终止进程 PID: ${pid}`);
                            } else {
                                console.log(`终止进程 PID ${pid} 失败，退出码: ${code}`);
                            }
                            resolve();
                        });
                        taskkill.on('error', (error) => {
                            console.log(`终止进程 PID ${pid} 出错:`, error.message);
                            resolve();
                        });
                        setTimeout(() => resolve(), 3000); // 3秒超时
                    });
                } catch (killError) {
                    console.log(`终止进程 ${pid} 失败:`, killError.message);
                }
            }
            
            return killedCount;
            
        } catch (error) {
            console.error('通过用户数据目录查找Chrome进程失败:', error);
            return 0;
        }
    }

    /**
     * 查找包含特定账号ID的Chrome进程
     */
    async findChromeProcessesByAccountId(accountId) {
        const { spawn } = require('child_process');
        
        return new Promise((resolve) => {
            let stdout = '';
            
            // 使用PowerShell获取Chrome进程的命令行
            const ps = spawn('powershell', [
                '-Command',
                `Get-WmiObject Win32_Process -Filter "name='chrome.exe'" | Where-Object { $_.CommandLine -like "*${accountId}*" } | Select-Object ProcessId | ForEach-Object { $_.ProcessId }`
            ], {
                stdio: ['ignore', 'pipe', 'ignore'],
                shell: false
            });
            
            ps.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            ps.on('close', (code) => {
                const pids = [];
                if (code === 0 && stdout.trim()) {
                    const lines = stdout.trim().split('\n');
                    for (const line of lines) {
                        const pid = parseInt(line.trim());
                        if (!isNaN(pid) && pid > 0) {
                            pids.push(pid);
                        }
                    }
                }
                resolve(pids);
            });
            
            ps.on('error', (error) => {
                console.log('PowerShell查找进程失败，尝试备用方法:', error.message);
                resolve([]);
            });
            
            // 10秒超时
            setTimeout(() => {
                ps.kill();
                resolve([]);
            }, 10000);
        });
    }

    /**
     * 检查进程是否真的在运行
     */
    isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 清理已死亡的进程记录
     */
    async cleanupDeadProcesses() {
        const deadProcesses = [];
        
        for (const [accountId, processInfo] of this.processes.entries()) {
            const runningByPid = this.isProcessRunning(processInfo.pid);
            let devtoolsAlive = false;
            if (!runningByPid && processInfo.debuggingPort) {
                devtoolsAlive = await this.waitForDevTools(processInfo.debuggingPort, 1000, 200);
            }
            if (!runningByPid && !devtoolsAlive) {
                deadProcesses.push(accountId);
            }
        }
        
        deadProcesses.forEach(accountId => {
            console.log(`清理死亡进程记录: ${accountId}`);
            this.processes.delete(accountId);
        });
        
        return deadProcesses.length;
    }

    /**
     * 获取运行中的浏览器列表
     */
    async getRunningBrowsers() {
        // 先清理死亡的进程（考虑 DevTools 端口）
        await this.cleanupDeadProcesses();
        
        const running = [];
        for (const [accountId, processInfo] of this.processes) {
            const runningByPid = this.isProcessRunning(processInfo.pid);
            let devtoolsAlive = false;
            if (processInfo.debuggingPort) {
                devtoolsAlive = await this.waitForDevTools(processInfo.debuggingPort, 1000, 200);
            }
            running.push({
                accountId,
                pid: processInfo.pid,
                windowName: processInfo.windowName,
                url: processInfo.url,
                startTime: processInfo.startTime,
                isRunning: runningByPid || devtoolsAlive
            });
        }
        return running;
    }

    /**
     * 检查浏览器是否在运行
     */
    async isBrowserRunning(accountId) {
        const processInfo = this.processes.get(accountId);
        if (!processInfo) {
            return false;
        }
        
        const runningByPid = this.isProcessRunning(processInfo.pid);
        let devtoolsAlive = false;
        if (!runningByPid && processInfo.debuggingPort) {
            // 主进程可能已退出，但实际窗口仍在运行；检查 DevTools 端口
            devtoolsAlive = await this.waitForDevTools(processInfo.debuggingPort, 1000, 200);
        }
        
        const isRunning = runningByPid || devtoolsAlive;
        
        // 仅当 PID 不在、且 DevTools 也不可达时，才清理记录
        if (!isRunning) {
            console.log(`发现死亡进程，清理记录: ${accountId} (PID: ${processInfo.pid}, Port: ${processInfo.debuggingPort})`);
            this.processes.delete(accountId);
        }
        
        return isRunning;
    }

    /**
     * 关闭所有浏览器实例
     */
    async closeAllBrowsers() {
        const results = [];
        for (const accountId of this.processes.keys()) {
            const result = await this.closeBrowser(accountId);
            results.push({ accountId, ...result });
        }
        return results;
    }

    /**
     * 设置Chrome路径（用于用户自定义）
     */
    setChromePath(chromePath) {
        if (!fs.existsSync(chromePath)) {
            throw new Error(`Chrome路径不存在: ${chromePath}`);
        }
        this.chromePath = chromePath;
    }

    /**
     * 获取Chrome路径
     */
    getChromePath() {
        return this.chromePath;
    }

    /**
     * 清理用户数据目录
     */
    cleanupUserData(accountId) {
        const profileDir = path.join(this.userDataDir, `profile_${accountId}`);
        if (fs.existsSync(profileDir)) {
            try {
                fs.rmSync(profileDir, { recursive: true, force: true });
                console.log(`已清理用户数据: ${profileDir}`);
            } catch (error) {
                console.error(`清理用户数据失败: ${error.message}`);
            }
        }
    }

    /**
     * 在指定账号的浏览器中执行JavaScript脚本
     * @param {string} accountId - 账号ID
     * @param {string} script - 要执行的JavaScript代码
     * @param {object} options - 执行选项
     * @returns {Promise<object>} 执行结果
     */
    async executeScript(accountId, script, options = {}) {
        const info = this.processes.get(accountId);
        if (!info) {
            return { success: false, error: '浏览器未运行' };
        }

        try {
            const port = info.debuggingPort;
            if (!port) {
                return { success: false, error: '该浏览器实例未启用远程调试端口' };
            }

            // 确保 DevTools 可用
            await this.waitForDevTools(port, 30000, 500);
            const targets = await CDP.List({ host: '127.0.0.1', port });
            const target = targets.find(t => t.type === 'page') || targets[0];
            if (!target) {
                return { success: false, error: '未找到可用的页面目标' };
            }
            const wsTarget = target.webSocketDebuggerUrl || target.id;

            return await this.withPageClient(port, wsTarget, async ({ Runtime }) => {
                const result = await this.evaluate(Runtime, script, options);
                return { success: true, result };
            });
        } catch (error) {
            console.error(`执行脚本失败:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 通过CDP协议注入高级指纹配置
     * 处理那些无法通过Chrome启动参数设置的高级指纹信息
     * @param {string} accountId - 账号ID
     * @param {number} debuggingPort - Chrome调试端口
     */
    async injectFingerprintConfiguration(accountId, debuggingPort) {
        if (!CDP) {
            console.warn('⚠️ chrome-remote-interface 未安装，跳过高级指纹注入');
            console.log('💡 安装命令: npm install chrome-remote-interface');
            return;
        }

        const fingerprintConfig = this.pendingFingerprintInjection.get(accountId);
        if (!fingerprintConfig) {
            console.warn('⚠️ 未找到待注入的指纹配置');
            return;
        }

        let client = null;
        try {
            console.log(`🔌 连接到Chrome DevTools: 端口 ${debuggingPort}`);
            client = await CDP({ port: debuggingPort });
            const { Runtime, Page } = client;
            
            // 启用必要的域
            await Runtime.enable();
            await Page.enable();
            console.log('✅ Chrome DevTools 连接成功');

            // 构建指纹注入脚本
            const injectionScript = this.buildFingerprintInjectionScript(fingerprintConfig);
            
            // 在所有页面加载前注入脚本
            await Page.addScriptToEvaluateOnNewDocument({
                source: injectionScript,
                worldName: 'MAIN'
            });
            
            console.log('✅ 指纹注入脚本已添加到所有新文档');

            // 如果当前已有页面，也注入到现有页面
            try {
                await Runtime.evaluate({
                    expression: injectionScript,
                    awaitPromise: false,
                    returnByValue: false
                });
                console.log('✅ 指纹配置已注入到当前页面');
            } catch (evalError) {
                console.log('📝 当前页面注入跳过（可能还没有页面加载）');
            }

            // 清理已处理的指纹配置
            this.pendingFingerprintInjection.delete(accountId);
            console.log('🧹 指纹配置已清理');

        } catch (error) {
            console.error('❌ 指纹配置注入失败:', error.message);
            throw error;
        } finally {
            if (client) {
                try {
                    await client.close();
                    console.log('🔌 DevTools连接已关闭');
                } catch (closeError) {
                    console.warn('⚠️ 关闭DevTools连接时出错:', closeError.message);
                }
            }
        }
    }

    /**
     * 构建指纹注入脚本
     * 这个脚本将在页面加载时修改各种浏览器API和属性
     * @param {Object} fingerprintConfig - 指纹配置对象
     * @returns {string} - 要注入的JavaScript代码
     */
    buildFingerprintInjectionScript(fingerprintConfig) {
        const platformString = this.getPlatformString(fingerprintConfig.os);
        
        return `
(function() {
    'use strict';
    console.log('🎯 开始注入浏览器指纹配置');

    // ===== Navigator 对象改写 =====
    const navigatorProps = {};
    
    // 硬件并发数 (CPU核心数)
    ${fingerprintConfig.hardwareConcurrency || fingerprintConfig.cores ? 
        `navigatorProps.hardwareConcurrency = ${fingerprintConfig.hardwareConcurrency || fingerprintConfig.cores};` : ''}
    
    // 设备内存
    ${fingerprintConfig.deviceMemory ? 
        `navigatorProps.deviceMemory = ${fingerprintConfig.deviceMemory};` : ''}
    
    // 语言设置
    ${fingerprintConfig.languages ? 
        `navigatorProps.languages = ${JSON.stringify(fingerprintConfig.languages)};
         navigatorProps.language = '${fingerprintConfig.languages[0]}';` : ''}
    
    // 平台信息
    ${fingerprintConfig.os ? 
        `navigatorProps.platform = '${platformString}';
         navigatorProps.userAgent = '${fingerprintConfig.userAgent || ''}';` : ''}
    
    // 应用Navigator属性改写
    Object.keys(navigatorProps).forEach(prop => {
        try {
            Object.defineProperty(Navigator.prototype, prop, {
                get: function() { return navigatorProps[prop]; },
                configurable: true,
                enumerable: true
            });
        } catch (e) {
            console.warn('⚠️ 无法改写Navigator.' + prop + ':', e.message);
        }
    });

    // ===== Screen 对象改写 =====
    ${fingerprintConfig.screen ? `
    const screenProps = {
        width: ${fingerprintConfig.screen.width},
        height: ${fingerprintConfig.screen.height},
        availWidth: ${fingerprintConfig.screen.width},
        availHeight: ${fingerprintConfig.screen.height - 40}, // 减去任务栏高度
        colorDepth: ${fingerprintConfig.screen.colorDepth || 24},
        pixelDepth: ${fingerprintConfig.screen.colorDepth || 24}
    };
    
    Object.keys(screenProps).forEach(prop => {
        try {
            Object.defineProperty(Screen.prototype, prop, {
                get: function() { return screenProps[prop]; },
                configurable: true,
                enumerable: true
            });
        } catch (e) {
            console.warn('⚠️ 无法改写Screen.' + prop + ':', e.message);
        }
    });
    ` : ''}

    // ===== WebGL 指纹改写 =====
    ${fingerprintConfig.webgl ? `
    const webglConfig = ${JSON.stringify(fingerprintConfig.webgl)};
    
    // 改写WebGL上下文的参数
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
        const context = origGetContext.apply(this, [contextType, ...args]);
        
        if (contextType.toLowerCase().includes('webgl') && context) {
            const origGetParameter = context.getParameter;
            context.getParameter = function(parameter) {
                // WebGL供应商
                if (parameter === context.VENDOR) {
                    return webglConfig.vendor || 'WebKit';
                }
                // WebGL渲染器
                if (parameter === context.RENDERER) {
                    return webglConfig.renderer || 'WebKit WebGL';
                }
                // WebGL版本
                if (parameter === context.VERSION) {
                    return webglConfig.version || 'WebGL 2.0';
                }
                // 着色器语言版本
                if (parameter === context.SHADING_LANGUAGE_VERSION) {
                    return webglConfig.shadingLanguageVersion || 'WebGL GLSL ES 3.00';
                }
                return origGetParameter.apply(this, arguments);
            };
        }
        
        return context;
    };
    ` : ''}

    // ===== Canvas 指纹改写 =====
    ${fingerprintConfig.canvas ? `
    const canvasConfig = ${JSON.stringify(fingerprintConfig.canvas)};
    
    // 改写Canvas的toDataURL方法来修改指纹
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const originalResult = origToDataURL.apply(this, args);
        
        // 为Canvas指纹添加微小的随机噪声
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.width;
        canvas.height = this.height;
        
        // 绘制原始内容
        ctx.drawImage(this, 0, 0);
        
        // 添加基于配置的噪声
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 使用配置的指纹值作为种子添加一致的噪声
        const seed = canvasConfig.fingerprint ? parseInt(canvasConfig.fingerprint.slice(0, 8), 16) : 12345;
        for (let i = 0; i < data.length; i += 4) {
            if (i % (seed % 100 + 10) === 0) {
                data[i] = Math.min(255, data[i] + (seed % 3) - 1);     // R
                data[i + 1] = Math.min(255, data[i + 1] + (seed % 5) - 2); // G  
                data[i + 2] = Math.min(255, data[i + 2] + (seed % 7) - 3); // B
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL(...args);
    };
    ` : ''}

    // ===== 时区改写 =====
    ${fingerprintConfig.timezone ? `
    // 改写时区相关方法
    const originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const targetTimezone = '${fingerprintConfig.timezone}';
    
    if (originalTimezone !== targetTimezone) {
        const origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
        Intl.DateTimeFormat.prototype.resolvedOptions = function() {
            const options = origResolvedOptions.call(this);
            options.timeZone = targetTimezone;
            return options;
        };
    }
    ` : ''}

    // ===== 插件列表改写 =====
    ${fingerprintConfig.plugins ? `
    const pluginsList = ${JSON.stringify(fingerprintConfig.plugins)};
    
    // 改写navigator.plugins
    Object.defineProperty(Navigator.prototype, 'plugins', {
        get: function() {
            const fakePlugins = pluginsList.map((plugin, index) => ({
                name: plugin.name,
                description: plugin.description,
                filename: plugin.filename,
                length: plugin.mimeTypes ? plugin.mimeTypes.length : 0,
                [Symbol.iterator]: function* () {
                    if (plugin.mimeTypes) {
                        for (let mimeType of plugin.mimeTypes) {
                            yield mimeType;
                        }
                    }
                }
            }));
            
            return {
                length: fakePlugins.length,
                ...fakePlugins,
                item: function(index) { return fakePlugins[index] || null; },
                namedItem: function(name) { 
                    return fakePlugins.find(p => p.name === name) || null; 
                },
                [Symbol.iterator]: function* () {
                    for (let plugin of fakePlugins) {
                        yield plugin;
                    }
                }
            };
        },
        configurable: true,
        enumerable: true
    });
    ` : ''}

    // ===== 其他指纹参数 =====
    
    // Cookie启用状态
    ${fingerprintConfig.cookieEnabled !== undefined ? 
        `Object.defineProperty(Navigator.prototype, 'cookieEnabled', {
            get: function() { return ${fingerprintConfig.cookieEnabled}; },
            configurable: true,
            enumerable: true
        });` : ''}
    
    // Java支持状态  
    ${fingerprintConfig.javaEnabled !== undefined ? 
        `Navigator.prototype.javaEnabled = function() { return ${fingerprintConfig.javaEnabled}; };` : ''}

    console.log('✅ 浏览器指纹配置注入完成');

})();
        `;
    }

    /**
     * 根据操作系统获取对应的平台字符串
     * @param {string} osType - 操作系统类型
     * @returns {string} - 平台字符串
     */
    getPlatformString(osType) {
        const platformMap = {
            'Windows': 'Win32',
            'Windows 10': 'Win32', 
            'Windows 11': 'Win32',
            'macOS': 'MacIntel',
            'Mac OS': 'MacIntel',
            'Linux': 'Linux x86_64',
            'Ubuntu': 'Linux x86_64'
        };
        return platformMap[osType] || 'Win32';
    }

    /**
     * 验证浏览器指纹配置是否正确应用
     * 通过CDP执行JavaScript来检查各种指纹参数
     * @param {number} debuggingPort - Chrome调试端口
     * @param {Object} expectedConfig - 预期的指纹配置
     * @returns {Object} - 验证结果
     */
    async validateFingerprintConfiguration(debuggingPort, expectedConfig) {
        if (!CDP) {
            console.warn('⚠️ chrome-remote-interface 未安装，无法验证指纹配置');
            return { success: false, error: 'CDP not available' };
        }

        let client = null;
        try {
            console.log(`🔍 开始验证指纹配置: 端口 ${debuggingPort}`);
            client = await CDP({ port: debuggingPort });
            const { Runtime } = client;
            
            await Runtime.enable();

            // 执行指纹检测脚本
            const validationScript = this.buildValidationScript(expectedConfig);
            const result = await Runtime.evaluate({
                expression: validationScript,
                awaitPromise: false,
                returnByValue: true
            });

            if (result.exceptionDetails) {
                throw new Error(`脚本执行错误: ${result.exceptionDetails.text}`);
            }

            const validationResults = result.result.value;
            console.log('🎯 指纹验证结果:', validationResults);

            return {
                success: true,
                results: validationResults,
                summary: this.generateValidationSummary(validationResults)
            };

        } catch (error) {
            console.error('❌ 指纹配置验证失败:', error.message);
            return { success: false, error: error.message };
        } finally {
            if (client) {
                try {
                    await client.close();
                } catch (closeError) {
                    console.warn('⚠️ 关闭验证连接时出错:', closeError.message);
                }
            }
        }
    }

    /**
     * 构建指纹验证脚本
     * @param {Object} expectedConfig - 预期配置
     * @returns {string} - 验证脚本
     */
    buildValidationScript(expectedConfig) {
        return `
(function() {
    'use strict';
    
    const results = {
        userAgent: {},
        navigator: {},
        screen: {},
        webgl: {},
        canvas: {},
        timezone: {},
        plugins: {},
        overall: { matches: 0, total: 0, mismatches: [] }
    };

    // 验证User-Agent
    results.userAgent.expected = ${expectedConfig.userAgent ? `"${expectedConfig.userAgent}"` : 'null'};
    results.userAgent.actual = navigator.userAgent;
    results.userAgent.matches = ${expectedConfig.userAgent ? 
        `navigator.userAgent === "${expectedConfig.userAgent}"` : 'true'};

    // 验证Navigator属性
    results.navigator.platform = {
        expected: ${expectedConfig.os ? `"${this.getPlatformString(expectedConfig.os)}"` : 'null'},
        actual: navigator.platform,
        matches: ${expectedConfig.os ? 
            `navigator.platform === "${this.getPlatformString(expectedConfig.os)}"` : 'true'}
    };

    results.navigator.language = {
        expected: ${expectedConfig.languages ? `"${expectedConfig.languages[0]}"` : 'null'},
        actual: navigator.language,
        matches: ${expectedConfig.languages ? 
            `navigator.language === "${expectedConfig.languages[0]}"` : 'true'}
    };

    results.navigator.languages = {
        expected: ${expectedConfig.languages ? JSON.stringify(expectedConfig.languages) : 'null'},
        actual: Array.from(navigator.languages || []),
        matches: ${expectedConfig.languages ? 
            `JSON.stringify(Array.from(navigator.languages || [])) === '${JSON.stringify(expectedConfig.languages)}'` : 'true'}
    };

    results.navigator.hardwareConcurrency = {
        expected: ${expectedConfig.hardwareConcurrency || expectedConfig.cores || 'null'},
        actual: navigator.hardwareConcurrency,
        matches: ${expectedConfig.hardwareConcurrency || expectedConfig.cores ? 
            `navigator.hardwareConcurrency === ${expectedConfig.hardwareConcurrency || expectedConfig.cores}` : 'true'}
    };

    results.navigator.deviceMemory = {
        expected: ${expectedConfig.deviceMemory || 'null'},
        actual: navigator.deviceMemory,
        matches: ${expectedConfig.deviceMemory ? 
            `navigator.deviceMemory === ${expectedConfig.deviceMemory}` : 'true'}
    };

    // 验证Screen属性
    ${expectedConfig.screen ? `
    results.screen.width = {
        expected: ${expectedConfig.screen.width},
        actual: screen.width,
        matches: screen.width === ${expectedConfig.screen.width}
    };

    results.screen.height = {
        expected: ${expectedConfig.screen.height},
        actual: screen.height,
        matches: screen.height === ${expectedConfig.screen.height}
    };

    results.screen.colorDepth = {
        expected: ${expectedConfig.screen.colorDepth || 24},
        actual: screen.colorDepth,
        matches: screen.colorDepth === ${expectedConfig.screen.colorDepth || 24}
    };
    ` : ''}

    // 验证WebGL
    ${expectedConfig.webgl ? `
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const vendor = gl.getParameter(gl.VENDOR);
            const renderer = gl.getParameter(gl.RENDERER);
            
            results.webgl.vendor = {
                expected: "${expectedConfig.webgl.vendor}",
                actual: vendor,
                matches: vendor === "${expectedConfig.webgl.vendor}"
            };

            results.webgl.renderer = {
                expected: "${expectedConfig.webgl.renderer}",
                actual: renderer,
                matches: renderer === "${expectedConfig.webgl.renderer}"
            };
        } else {
            results.webgl.error = 'WebGL context not available';
        }
    } catch (e) {
        results.webgl.error = e.message;
    }
    ` : ''}

    // 验证Canvas指纹
    ${expectedConfig.canvas ? `
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;
        
        // 绘制测试图案
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Canvas fingerprint test 🎯', 2, 2);
        
        const canvasData = canvas.toDataURL();
        results.canvas.dataUrl = {
            actual: canvasData.substring(0, 100) + '...',
            hasData: canvasData.length > 100,
            matches: canvasData.length > 100 // 简单检查是否有数据
        };
    } catch (e) {
        results.canvas.error = e.message;
    }
    ` : ''}

    // 验证时区
    ${expectedConfig.timezone ? `
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        results.timezone = {
            expected: "${expectedConfig.timezone}",
            actual: timezone,
            matches: timezone === "${expectedConfig.timezone}"
        };
    } catch (e) {
        results.timezone.error = e.message;
    }
    ` : ''}

    // 验证插件
    ${expectedConfig.plugins ? `
    results.plugins = {
        expected: ${expectedConfig.plugins.length},
        actual: navigator.plugins.length,
        matches: navigator.plugins.length === ${expectedConfig.plugins.length},
        pluginNames: Array.from(navigator.plugins).map(p => p.name)
    };
    ` : ''}

    // 计算总体匹配度
    function calculateOverall(obj, path = '') {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (obj[key].hasOwnProperty('matches')) {
                    results.overall.total++;
                    if (obj[key].matches) {
                        results.overall.matches++;
                    } else {
                        results.overall.mismatches.push({
                            field: path + key,
                            expected: obj[key].expected,
                            actual: obj[key].actual
                        });
                    }
                } else if (!obj[key].hasOwnProperty('error')) {
                    calculateOverall(obj[key], path + key + '.');
                }
            }
        }
    }

    calculateOverall(results);

    results.overall.percentage = results.overall.total > 0 ? 
        Math.round((results.overall.matches / results.overall.total) * 100) : 100;

    results.timestamp = new Date().toISOString();
    
    return results;
})();
        `;
    }

    /**
     * 生成验证摘要
     * @param {Object} validationResults - 验证结果
     * @returns {string} - 验证摘要文本
     */
    generateValidationSummary(validationResults) {
        const { overall } = validationResults;
        
        let summary = `🎯 指纹配置验证摘要\n`;
        summary += `匹配度: ${overall.matches}/${overall.total} (${overall.percentage}%)\n`;
        
        if (overall.percentage >= 90) {
            summary += `✅ 指纹配置应用成功！`;
        } else if (overall.percentage >= 70) {
            summary += `⚠️ 指纹配置部分应用成功，存在少量差异`;
        } else {
            summary += `❌ 指纹配置应用失败，存在较多差异`;
        }

        if (overall.mismatches.length > 0) {
            summary += `\n\n🔍 不匹配的项目:`;
            overall.mismatches.forEach(mismatch => {
                summary += `\n• ${mismatch.field}: 预期 "${mismatch.expected}" 实际 "${mismatch.actual}"`;
            });
        }

        return summary;
    }

    /**
     * 一键测试指纹配置应用效果
     * 启动浏览器 -> 应用指纹 -> 验证结果
     * @param {Object} account - 账号配置
     * @param {string} testUrl - 测试URL（可选，默认使用指纹检测网站）
     * @returns {Object} - 测试结果
     */
    async testFingerprintConfiguration(account, testUrl = 'https://browserleaks.com/javascript') {
        console.log(`🧪 开始测试账号 ${account.windowName} 的指纹配置`);
        
        try {
            // 1. 启动浏览器（自动应用指纹）
            const launchResult = await this.launchBrowser(account, testUrl, {
                debuggingPort: this.nextDebuggingPort++,
                windowConfig: { width: 1200, height: 800, left: 100, top: 100 }
            });

            if (!launchResult.success) {
                throw new Error(`浏览器启动失败: ${launchResult.error}`);
            }

            // 2. 等待页面加载
            console.log('⏳ 等待页面加载...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 3. 验证指纹配置
            const validationResult = await this.validateFingerprintConfiguration(
                launchResult.debuggingPort,
                account.fingerprintConfig
            );

            // 4. 输出测试结果
            const testResult = {
                account: account.windowName,
                launchSuccess: launchResult.success,
                validationSuccess: validationResult.success,
                debuggingPort: launchResult.debuggingPort,
                ...validationResult
            };

            console.log('🧪 测试完成!');
            console.log(testResult.summary || '无验证摘要');

            return testResult;

        } catch (error) {
            console.error('❌ 指纹配置测试失败:', error.message);
            return {
                success: false,
                error: error.message,
                account: account.windowName
            };
        }
    }
}

// 导出类和单例实例
module.exports = BrowserManager;
module.exports.instance = new BrowserManager();