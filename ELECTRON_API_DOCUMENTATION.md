# ElectronAPI 完整文档

本文档详细说明了应用中可用的所有 ElectronAPI 方法和工具函数。

## 📋 目录

1. [基础浏览器管理 API](#基础浏览器管理-api)
2. [Shell 相关 API](#shell-相关-api)
3. [剪贴板 API](#剪贴板-api)
4. [对话框 API](#对话框-api)
5. [应用信息 API](#应用信息-api)
6. [窗口控制 API](#窗口控制-api)
7. [工具函数](#工具函数)
8. [使用示例](#使用示例)

---

## 基础浏览器管理 API

### `launchBrowser(account, url, options)`
启动浏览器实例
- **参数**：
  - `account`: 账号对象
  - `url`: 要打开的URL
  - `options`: 启动选项
- **返回**：`Promise<{success: boolean, error?: string}>`

### `closeBrowser(accountId)`
关闭指定的浏览器实例
- **参数**：`accountId` - 账号ID
- **返回**：`Promise<{success: boolean, error?: string}>`

### `getRunningBrowsers()`
获取运行中的浏览器列表
- **返回**：`Promise<Array>`

### `isBrowserRunning(accountId)`
检查浏览器是否在运行
- **参数**：`accountId` - 账号ID
- **返回**：`Promise<boolean>`

### `closeAllBrowsers()`
关闭所有浏览器实例
- **返回**：`Promise<{success: boolean, error?: string}>`

---

## Shell 相关 API

### `openExternal(url)`
在默认浏览器中打开URL
- **参数**：`url` - 要打开的网址
- **返回**：`Promise<{success: boolean, error?: string}>`

```javascript
// 示例
await window.electronAPI.openExternal('https://github.com');
```

### `openPath(path)`
使用默认程序打开文件或文件夹
- **参数**：`path` - 文件或文件夹路径
- **返回**：`Promise<{success: boolean, error?: string}>`

```javascript
// 示例
await window.electronAPI.openPath('C:\\Users\\Documents');
```

### `trashItem(path)`
将文件或文件夹移动到回收站
- **参数**：`path` - 要删除的文件或文件夹路径
- **返回**：`Promise<{success: boolean, error?: string}>`

```javascript
// 示例
await window.electronAPI.trashItem('C:\\temp\\old_file.txt');
```

### `showItemInFolder(fullPath)`
在文件管理器中显示并高亮文件或文件夹
- **参数**：`fullPath` - 完整路径
- **返回**：`Promise<{success: boolean, error?: string}>`

```javascript
// 示例
await window.electronAPI.showItemInFolder('C:\\Users\\Documents\\file.txt');
```

---

## 剪贴板 API

### `writeText(text)`
将文本写入剪贴板
- **参数**：`text` - 要复制的文本
- **返回**：`Promise<{success: boolean, error?: string}>`

```javascript
// 示例
await window.electronAPI.writeText('Hello, World!');
```

### `readText()`
从剪贴板读取文本
- **返回**：`Promise<{success: boolean, text: string, error?: string}>`

```javascript
// 示例
const result = await window.electronAPI.readText();
if (result.success) {
    console.log('剪贴板内容:', result.text);
}
```

### `writeImage(image)`
将图片写入剪贴板
- **参数**：`image` - 图片数据（DataURL格式）
- **返回**：`Promise<{success: boolean, error?: string}>`

### `readImage()`
从剪贴板读取图片
- **返回**：`Promise<{success: boolean, image: string|null, error?: string}>`

---

## 对话框 API

### `showOpenDialog(options)`
显示文件选择对话框
- **参数**：`options` - 对话框选项
- **返回**：`Promise<{canceled: boolean, filePaths: string[]}>`

```javascript
// 示例
const result = await window.electronAPI.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
        { name: '文本文件', extensions: ['txt', 'md'] },
        { name: '所有文件', extensions: ['*'] }
    ]
});
```

### `showSaveDialog(options)`
显示保存文件对话框
- **参数**：`options` - 对话框选项
- **返回**：`Promise<{canceled: boolean, filePath?: string}>`

### `showMessageBox(options)`
显示消息对话框
- **参数**：`options` - 对话框选项
- **返回**：`Promise<{response: number}>`

```javascript
// 示例
const result = await window.electronAPI.showMessageBox({
    type: 'question',
    title: '确认',
    message: '确定要继续吗？',
    buttons: ['确定', '取消'],
    defaultId: 0,
    cancelId: 1
});
// result.response: 0=确定, 1=取消
```

### `showErrorBox(title, content)`
显示错误对话框
- **参数**：
  - `title` - 对话框标题
  - `content` - 错误内容
- **返回**：`Promise<{success: boolean}>`

---

## 应用信息 API

### `getAppVersion()`
获取应用版本号
- **返回**：`Promise<{success: boolean, version: string}>`

### `getAppName()`
获取应用名称
- **返回**：`Promise<{success: boolean, name: string}>`

```javascript
// 示例
const versionResult = await window.electronAPI.getAppVersion();
const nameResult = await window.electronAPI.getAppName();
console.log(`${nameResult.name} v${versionResult.version}`);
```

---

## 窗口控制 API

### `minimizeWindow()`
最小化应用窗口
- **返回**：`Promise<{success: boolean, error?: string}>`

### `maximizeWindow()`
最大化或还原应用窗口
- **返回**：`Promise<{success: boolean, isMaximized: boolean, error?: string}>`

### `closeWindow()`
关闭应用窗口
- **返回**：`Promise<{success: boolean, error?: string}>`

### `isMaximized()`
检查窗口是否已最大化
- **返回**：`Promise<{success: boolean, isMaximized: boolean}>`

---

## 工具函数

以下是基于原始API封装的高级工具函数，提供更友好的用户体验：

### Shell 工具函数

#### `openInBrowser(url)`
在默认浏览器中打开URL（带通知）
```javascript
const success = await openInBrowser('https://github.com');
```

#### `openFolder(path)`
打开文件夹（带通知）
```javascript
const success = await openFolder('C:\\Users\\Documents');
```

#### `showInFolder(path)`
在文件夹中显示文件（带通知）
```javascript
const success = await showInFolder('C:\\Users\\Documents\\file.txt');
```

#### `deleteToTrash(path)`
删除文件到回收站（带确认对话框）
```javascript
const success = await deleteToTrash('C:\\temp\\old_file.txt');
```

### 剪贴板工具函数

#### `copyToClipboard(text)`
复制文本到剪贴板（带通知）
```javascript
const success = await copyToClipboard('Hello, World!');
```

#### `pasteFromClipboard()`
从剪贴板粘贴文本
```javascript
const text = await pasteFromClipboard();
```

### 对话框工具函数

#### `showConfirmDialog(title, message, confirmText, cancelText)`
显示确认对话框
```javascript
const confirmed = await showConfirmDialog('确认删除', '确定要删除这个文件吗？', '删除', '取消');
```

#### `showInfoDialog(title, message)`
显示信息对话框
```javascript
await showInfoDialog('成功', '操作已完成！');
```

#### `showErrorDialog(title, message)`
显示错误对话框
```javascript
await showErrorDialog('错误', '操作失败，请重试。');
```

### 文件选择工具函数

#### `selectFile(options)`
选择文件
```javascript
const filePath = await selectFile({
    filters: [
        { name: '文本文件', extensions: ['txt', 'md'] },
        { name: '所有文件', extensions: ['*'] }
    ]
});
```

#### `selectFolder()`
选择文件夹
```javascript
const folderPath = await selectFolder();
```

### 应用信息工具函数

#### `getAppInfo()`
获取完整应用信息
```javascript
const info = await getAppInfo();
console.log(`${info.name} v${info.version}`);
```

### 窗口控制工具函数

#### `minimizeApp()`
最小化应用
```javascript
const success = await minimizeApp();
```

#### `maximizeApp()`
最大化/还原应用
```javascript
const success = await maximizeApp();
```

---

## 使用示例

### 1. 基本使用模式

```javascript
// 等待API就绪
const apiReady = await waitForElectronAPI(['openExternal', 'writeText']);
if (!apiReady) {
    console.warn('API不可用');
    return;
}

// 使用API
await window.electronAPI.openExternal('https://example.com');
await window.electronAPI.writeText('Hello, World!');
```

### 2. 错误处理

```javascript
try {
    const result = await window.electronAPI.openPath('C:\\invalid\\path');
    if (!result.success) {
        console.error('操作失败:', result.error);
        showNotification(`操作失败: ${result.error}`, 'error');
    }
} catch (error) {
    console.error('API调用异常:', error);
    showNotification('系统错误，请重试', 'error');
}
```

### 3. 使用工具函数（推荐）

```javascript
// 更简单的使用方式
const success = await openInBrowser('https://github.com');
const confirmed = await showConfirmDialog('确认', '确定要继续吗？');
const filePath = await selectFile();
```

### 4. 批量操作

```javascript
// 并行执行多个API调用
const [appInfo, clipboardText] = await Promise.all([
    getAppInfo(),
    pasteFromClipboard()
]);

console.log(`应用: ${appInfo.name} v${appInfo.version}`);
console.log(`剪贴板: ${clipboardText}`);
```

---

## 注意事项

1. **API可用性检查**：始终使用 `waitForElectronAPI()` 检查API是否可用
2. **错误处理**：所有API调用都应该包含适当的错误处理
3. **用户体验**：使用工具函数可以获得更好的用户体验（自动显示通知、确认对话框等）
4. **性能考虑**：避免频繁调用API，特别是文件系统相关的操作
5. **安全性**：不要将用户输入直接传递给文件系统API，应该进行适当的验证

---

## 测试页面

可以使用 `electron-api-examples.html` 页面来测试所有API功能。该页面提供了：
- 所有API的交互式测试界面
- 实时结果显示
- API状态检查工具
- 使用示例和说明

在Electron应用中打开该页面即可开始测试。

---

*文档版本：2024-12-19*
*对应代码版本：增强版ElectronAPI*