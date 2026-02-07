<template>
  <div class="max-w-5xl mx-auto flex flex-col gap-6 p-6 pb-20">
    <!-- 顶部说明 -->
    <div class="flex items-center gap-2 px-1">
      <i class="ri-information-line text-slate-400"></i>
      <p class="text-xs text-slate-500 font-medium">
        欢迎使用 Ozon 自动投诉助手。本指南将协助您完成插件安装及自动化任务的配置。
      </p>
    </div>

    <!-- 插件安装卡片 -->
    <section class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="bg-ozon p-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold">1. 插件套件部署</h3>
            <p class="text-blue-100 text-xs mt-1">
              遵循浏览器安全策略，需通过“开发者模式”手动加载部署包
            </p>
          </div>
          <button
            @click="openPluginFolder"
            class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border border-white/20"
          >
            <i class="ri-folder-open-line"></i>
            打开插件所在目录
          </button>
        </div>
      </div>
      <div class="p-6 space-y-6">
        <div class="grid grid-cols-3 gap-6">
          <div class="space-y-3">
            <div
              class="w-8 h-8 rounded-full bg-blue-50 text-ozon flex items-center justify-center font-bold text-sm"
            >
              1
            </div>
            <p class="text-xs font-bold text-slate-700">打开 Chrome 扩展程序</p>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              在浏览器地址栏输入
              <code class="bg-slate-100 px-1 py-0.5 rounded text-ozon font-mono"
                >chrome://extensions/</code
              >
              并回车。
            </p>
          </div>
          <div class="space-y-3">
            <div
              class="w-8 h-8 rounded-full bg-blue-50 text-ozon flex items-center justify-center font-bold text-sm"
            >
              2
            </div>
            <p class="text-xs font-bold text-slate-700">开启开发者模式</p>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              在页面右上角找到“开发者模式”开关，并确保已开启。
            </p>
          </div>
          <div class="space-y-3">
            <div
              class="w-8 h-8 rounded-full bg-blue-50 text-ozon flex items-center justify-center font-bold text-sm"
            >
              3
            </div>
            <p class="text-xs font-bold text-slate-700">加载已解压的扩展程序</p>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              点击左上角的“加载已解压的扩展程序”，并在弹出的对话框中选择本项目根目录下的
              <code class="bg-slate-100 px-1 py-0.5 rounded text-ozon font-mono"
                >chrome-plugin</code
              >
              文件夹。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用步骤 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 应用准备 -->
      <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3
          class="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3"
        >
          <i class="ri-settings-4-line text-ozon"></i>
          2. 本地资产与任务初始化
        </h3>
        <ul class="space-y-4">
          <li class="flex items-start gap-3">
            <div
              class="w-5 h-5 rounded-full bg-blue-50 text-ozon flex items-center justify-center shrink-0 mt-0.5"
            >
              <span class="text-[10px] font-bold">A</span>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-bold text-slate-700">配置本征证明库</p>
              <p class="text-[11px] text-slate-500">
                进入“凭证库”上传预案所需的法律及授权证明文件，系统将智能提取。
              </p>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="w-5 h-5 rounded-full bg-blue-50 text-ozon flex items-center justify-center shrink-0 mt-0.5"
            >
              <span class="text-[10px] font-bold">B</span>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-bold text-slate-700">录入申诉目标序列</p>
              <p class="text-[11px] text-slate-500">
                在“投诉记录”中粘贴或导入 SKU 清单，系统将自动分配至待发送序列。
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- 自动化执行 -->
      <section class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3
          class="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3"
        >
          <i class="ri-rocket-line text-emerald-500"></i>
          3. 触发执行 (浏览器)
        </h3>
        <ul class="space-y-4">
          <li class="flex items-start gap-3">
            <div
              class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"
            >
              <span class="text-[10px] font-bold">1</span>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-bold text-slate-700">登录 Ozon 后台</p>
              <p class="text-[11px] text-slate-500">在 Chrome 中正常登录您的卖家账号。</p>
            </div>
          </li>
          <li class="flex items-start gap-3">
            <div
              class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5"
            >
              <span class="text-[10px] font-bold">2</span>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-bold text-slate-700">右键菜单开启</p>
              <p class="text-[11px] text-slate-500">
                右键点击页面空白处，选择
                <span class="font-bold text-emerald-600">“提交 Ozon 投诉”</span>。
              </p>
            </div>
          </li>
        </ul>
      </section>

      <!-- 常见问题 -->
      <section
        class="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4"
      >
        <h3
          class="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3"
        >
          <i class="ri-question-line text-purple-500"></i>
          常见问题
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div class="space-y-1">
            <p class="text-[11px] font-bold text-slate-700">问：为什么右键菜单没有出现？</p>
            <p class="text-[11px] text-slate-500">
              答：请确保插件已正确安装且处于“开启”状态，尝试刷新 Ozon 页面。
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-[11px] font-bold text-slate-700">问：为什么显示“正在处理”但没动静？</p>
            <p class="text-[11px] text-slate-500">
              答：请检查 Electron 应用是否正在运行。如果任务超过 10
              分钟无响应，系统会将其重置为超时，您可以手动重置。
            </p>
          </div>
        </div>
      </section>
    </div>

    <!-- 补充提醒 -->
    <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
      <i class="ri-error-warning-line text-amber-600 text-lg"></i>
      <p class="text-[11px] text-amber-700 leading-relaxed">
        <strong>安全说明：</strong>
        本工具及其插件仅用于辅助操作员提交投诉，不涉及任何账号密码的劫持或存储。所有投诉记录及凭证图片均保存在您的本地数据库中。请妥善保管好您的本地数据文件夹。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const openPluginFolder = () => {
  // 向主进程发送指令打开插件目录
  if ((window as any).electron && (window as any).electron.ipcRenderer) {
    ;(window as any).electron.ipcRenderer.send('server:open-plugin-folder')
  }
}
</script>
