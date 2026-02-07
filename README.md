# OzonAssist

> **Ozon 卖家自动化维权终极武器** —— 100% 本地运行、代码开源透明的专业级维权申诉套件。

[![Build & Release](https://github.com/hazedays/ozon-assist/actions/workflows/release.yml/badge.svg)](https://github.com/hazedays/ozon-assist/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

OzonAssist 专为处理 Ozon 平台上的侵权申诉而设计。它通过“本地数据增强架构”，将繁琐的凭证管理、SKU 匹配与插件自动化提交深度集成，显著提升跨境大卖家的维权效率。

---

<div align="center">
  <img src="https://raw.githubusercontent.com/hazedays/ozon-assist/master/resources/logo.svg" width="120" alt="OzonAssist Logo" />
  <br />
  <p><i>基于本地数据安全架构的桌面申诉工作台</i></p>
</div>

---

## 🚀 核心特性

- **本地优先架构**：所有图片凭证、SKU 数据和申诉历史均使用加密的 SQLite 存储于本地，拒绝强制上云，保护商业机密。
- **智能化流程**：通过 Chrome MV3 插件与桌面端精密同步，实现一键自动化填充与提交投诉单，告别繁琐的复制粘贴。
- **多平台支持**：基于 Electron 40+ 与 Vue 3 深度定制，完美支持 macOS (Apple Silicon / Intel) 与 Windows 10/11。
- **极速同步流**：内置 30ms 写入缓冲与 IPC 实时广播系统，确保插件与客户端之间的数据刷新实时无延迟。
- **双重提醒系统**：深度集成系统原生通知（Notification）与**强交互对话框（Dialog）**。当任务遇到障碍或全部处理完成时，即便应用在后台也能确保你收到反馈。
- **实时耗时统计**：引入 `started_at` 时间基准，精确计算每个 SKU 的实际执行耗时，帮助优化申诉流程。

## 📥 安装与运行

### 插件安装 (必选)

1. 打开 Chrome 浏览器，进入 `chrome://extensions/`。
2. 开启右上角的 **"开发者模式"**。
3. 点击 **"加载已解压的扩展程序"**。
4. 选择项目根目录下的 `chrome-plugin` 文件夹即可。

### 客户端获取

- **普通用户**: 前往 [Releases](https://github.com/hazedays/ozon-assist/releases) 下载 `.dmg` (macOS) 或 `.exe` (Windows) 安装包。
- **开发者**:

  ```bash
  npm install
  npm run dev
  ```

## 🔌 插件通讯协议 (Internal API)

OzonAssist 默认在本地 `127.0.0.1:8972` 开启服务，供插件进行交互。使用固定 IP 替代 `localhost` 解决了绝大多数 Windows 防火墙拦截问题。

- `GET /api/status`: 健康检查。
- `GET /api/complaint/unprocessed`: 获取下一条待处理任务（自动记录 `started_at`）。
- `POST /api/complaint/:sku/status`: 更新任务状态（`success` / `failed`）。
- `POST /api/complaint/:sku/image`: 关联特定维权图片。
- `GET /api/task/failed`: 脚本执行异常上报（触发 OS 强交互弹窗）。

## 📊 任务状态说明

- **Pending**: 准备就绪，等待处理。
- **Processing**: 执行中，UI 会显示实时动态秒表。
- **Success**: 处理圆满完成（注：原 `resolved` 已弃用，请确认为 `success`）。
- **Timeout**: 超过 2 分钟未响应的任务将被系统自动标记为超时，防止队列阻塞。

## ❓ 常见问题 (FAQ)

**Q: 我的数据存在哪里？**
A: 所有数据存储于本地用户数据目录下的 `data/database.sqlite`。你可以通过日志面板查看具体路径。

**Q: macOS 提示“已损坏”无法打开？**
A: 这是因为开发者未进行 Apple 付费签名。请执行以下命令：
`sudo xattr -rd com.apple.quarantine /Applications/OzonAssist.app`

**Q: 插件连接不上客户端？**
A: 检查防火墙是否允许 `8972` 端口通讯。由于采用了 `127.0.0.1` 物理回路，通常不需要特殊配置。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源。

---

© 2026 Hazedays & OzonAssist Team. Powered by **Speed and Transparency**.
