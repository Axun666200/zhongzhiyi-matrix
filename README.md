# 🌟 众之翼矩阵 (ZhongZhiYi Matrix)

一个功能强大的内容创作桌面应用，基于Electron构建，提供AI智能内容生成和管理功能。

![Version](https://img.shields.io/badge/version-1.0.5-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📦 下载安装

### 最新版本下载

1. **从GitHub Releases下载**（推荐）
   - 访问 [Releases页面](https://github.com/Axun666200/zhongzhiyi-matrix/releases)
   - 下载最新版本的DMG文件

2. **从GitHub Actions下载**（开发版本）
   - 访问 [Actions页面](https://github.com/Axun666200/zhongzhiyi-matrix/actions)
   - 选择最新的成功构建
   - 下载 `macos-build` 构建产物

### 安装说明

1. 下载DMG文件到本地
2. 双击打开DMG文件
3. 将应用拖拽到 `Applications` 文件夹
4. 在启动台中找到并启动应用

## 🚀 功能特性

- **🤖 AI内容生成**: 智能创作工具
- **📱 多平台支持**: 适配主流内容平台
- **🔐 认证系统**: 安全的用户认证机制
- **🎨 可视化界面**: 现代化的用户界面
- **⚡ 高性能**: 基于Electron的跨平台解决方案

## 🛠️ 开发环境

如果您想从源码构建应用：

### 环境要求

- Node.js 18+
- npm 或 yarn
- macOS (用于构建macOS版本)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm start
```

### 构建应用

```bash
# 构建macOS版本
npm run build:mac

# 构建所有平台
npm run build
```

## 📁 项目结构

```
zhongzhiyi-matrix/
├── main.js              # Electron主进程
├── main.html            # 主界面
├── preload.js           # 预加载脚本
├── package.json         # 项目配置
├── electron-builder.yml # 构建配置
├── auth/                # 认证相关
├── components/          # 组件目录
├── images/              # 图像资源
└── .github/workflows/   # CI/CD配置
```

## 🔧 配置说明

应用支持多种配置选项，详见：
- `认证系统使用说明.md` - 认证系统配置
- `用户安装指南.md` - 用户安装指导
- `构建完成说明.md` - 构建相关说明

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 开发团队

**众之翼团队** - *初始开发* - [Axun666200](https://github.com/Axun666200)

## 🐛 问题反馈

如果您发现任何问题或有功能建议，请：

1. 查看 [Issues](https://github.com/Axun666200/zhongzhiyi-matrix/issues) 是否已有相关问题
2. 如果没有，请创建新的Issue
3. 提供详细的问题描述和复现步骤

## 📱 联系我们

- 项目仓库: https://github.com/Axun666200/zhongzhiyi-matrix
- 问题反馈: [GitHub Issues](https://github.com/Axun666200/zhongzhiyi-matrix/issues)

---

💝 **感谢使用众之翼矩阵！让创作更智能，让内容更精彩！**