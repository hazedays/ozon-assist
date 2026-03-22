# OzonAssist 架构图与流程图

本文基于当前代码实现生成，覆盖桌面端、插件端、本地 API 与自动投诉执行主流程。

## 1) 系统完整架构图

```mermaid
flowchart TB
  U[用户]

  subgraph Desktop[Electron 桌面应用]
    R[Renderer Vue3 + Pinia + Router]
    P[Preload contextBridge]
    M[Main Process]

    subgraph IPC[IPC 服务层]
      RS[serverRendererService]
      RD[databaseRendererService]
    end

    subgraph Core[核心服务层]
      SS[ServerService Express 127.0.0.1:8972]
      DS[DatabaseService better-sqlite3]
      LG[Main Logger]
    end
  end

  subgraph Data[本地数据]
    DB[(SQLite database.sqlite)]
    FS[(images/ 与 logs/ 文件)]
  end

  subgraph Ext[Chrome 插件 MV3]
    BG[background service worker]
    CS[content script 自动化调度]
    CL[plugin logger]
  end

  OZ[Ozon Seller 页面]

  U -->|操作页面| R
  R <-->|invoke/handle| P
  P <-->|IPC| RS
  P <-->|IPC| RD

  RS --> SS
  RD --> DS
  SS <-->|读写任务/图片/状态| DS
  DS --> DB
  SS --> FS
  DS --> FS

  BG <-->|消息| CS
  CS -->|DOM 自动化| OZ
  CS -->|chrome.runtime.sendMessage get/post|getpost[(BG 网络代理)]
  getpost -->|HTTP /api/*| SS

  CL -->|POST /api/plugin/log| SS
  SS -->|GET/DELETE /api/plugin/logs| R

  SS -->|database:updated| R
  LG --> FS
```

## 2) 自动投诉执行流程图（端到端）

```mermaid
flowchart TD
  A[页面 load 或收到 start-auto-complaint] --> B[runComplaintScheduler]
  B --> C[runComplaintTick]

  C --> D[ensureConversationReady]
  D -->|未就绪/漂移修正/需跳转| C0[结束本轮 等下一轮]
  D -->|就绪| E[handleResultStage 先做结果检测]

  E -->|命中成功文案| E1[POST /complaint/:sku/status = success]
  E -->|命中失败文案| E2[POST /complaint/:sku/status = failed]
  E1 --> E3[清理 current_chat_id 与 processing SKU]
  E2 --> E3
  E3 --> C0

  E -->|未命中结果| F[navigateComplaintMenu]
  F --> G[handleSkuInputStage]

  G -->|命中输入条件| H[GET /complaint/unprocessed]
  H -->|无 sku| H1[记录 completed no-sku-returned 并停止]
  H -->|取到 sku| I[simulateKeyboardInput 输入 SKU]
  I -->|发送可用| J[点击发送]
  I -->|发送不可用| C0
  J --> C0

  G -->|未命中输入条件| K[handleImageUploadStage]
  K -->|进入附件阶段| L[GET /image/random 并注入 file input]
  L --> M[检测预览 + 发送按钮可用后点击发送]
  M --> C0
  K -->|未进入附件阶段| C0

  C0 --> B
```

## 3) 数据导入与任务状态流

```mermaid
flowchart LR
  U[用户在渲染端导入 SKU/图片] --> R1[databaseService IPC 调用]
  R1 --> D1[databaseRendererService]
  D1 --> DB1[(SQLite)]

  DB1 --> N1[database:updated 广播]
  N1 --> U2[渲染端列表/统计刷新]

  CS1[插件请求 /complaint/unprocessed] --> API1[ServerService]
  API1 --> TX[事务: pending -> processing]
  TX --> DB1

  CS2[插件回写 /complaint/:sku/status] --> API1
  API1 --> DB1
  API1 --> N1
```

## 4) 插件日志与可观测性流程

```mermaid
flowchart LR
  CSG[content script logger/runtimeEvent] --> BGW[background 转发]
  BGW --> APILog[POST /api/plugin/log]
  APILog --> MEM[(内存环形日志 2000)]

  RV[日志页 logs.vue] --> GETLOG[GET /api/plugin/logs?limit]
  GETLOG --> MEM
  MEM --> RV

  RV --> DELLOG[DELETE /api/plugin/logs]
  DELLOG --> MEM

  MEM --> STOP[complaint.stop-stats 事件]
  STOP --> RV
```

## 5) 模块与职责速览

- 桌面主进程: 窗口生命周期、Express 本地 API、SQLite、系统通知。
- 渲染进程: 投诉管理、图片管理、运行配置、日志监控。
- 预加载层: 暴露受控 IPC 通道。
- 插件 Background: 右键菜单、消息中继、HTTP 代理。
- 插件 Content Script: Ozon 页面 DOM 自动化执行与结果判断。

## 6) 关键接口清单

- GET /api/status
- GET /api/complaint/unprocessed
- POST /api/complaint/:sku/status
- POST /api/complaint/:sku/image
- GET /api/image/random
- POST /api/plugin/log
- GET /api/plugin/logs
- DELETE /api/plugin/logs
- GET /api/plugin/runtime-config
- POST /api/plugin/runtime-config
- GET /api/task/failed
