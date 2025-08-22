# 众之翼矩阵 - 跨平台构建说明

## 🚀 构建选项

### 方案1：GitHub Actions自动构建（推荐）

1. 将代码推送到GitHub仓库
2. 创建一个tag来触发构建：
   ```bash
   git tag v1.0.5
   git push origin v1.0.5
   ```
3. GitHub Actions会自动构建Windows和macOS版本
4. 构建完成后可以从Actions页面下载

### 方案2：本地Windows构建

```bash
# 只构建Windows版本
npm run build:win
```

### 方案3：使用云端构建服务

可以使用以下服务：
- GitHub Codespaces（macOS环境）
- Replit
- GitPod

### 方案4：Docker构建（实验性）

```bash
# 构建Docker镜像
docker build -f Dockerfile.mac -t zhongzhiyi-mac-builder .

# 运行构建
docker run -v $(pwd)/dist:/project/dist zhongzhiyi-mac-builder
```

## 📦 构建产物

- Windows: `众之翼矩阵 Setup 1.0.5.exe`
- macOS: `众之翼矩阵 1.0.5.dmg`

## 🔧 手动构建步骤

如果有Mac电脑，可以：

1. 复制整个项目到Mac
2. 安装依赖：`npm install`
3. 构建：`npm run build:mac`

## 📋 注意事项

- macOS构建需要在macOS系统上进行
- GitHub Actions是最便捷的跨平台构建方案
- 确保所有依赖都已正确安装