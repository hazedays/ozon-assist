<template>
  <div class="flex-1 w-full max-w-4xl mx-auto p-12 lg:p-20 flex flex-col justify-center">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-black text-slate-800 tracking-tighter uppercase mb-4">联系支持</h2>
      <p class="text-slate-500 font-medium max-w-lg mx-auto">
        我们在每个工作日为您提供专业的技术支持和业务咨询，助您轻松应对任何投诉困难。
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        class="group p-8 bg-white border border-slate-100 rounded-[32px] flex flex-col items-center text-center transition-all hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2 cursor-pointer"
      >
        <div
          class="w-16 h-16 bg-blue-50 text-ozon-blue rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-ozon-blue group-hover:text-white transition-colors"
        >
          <i class="ri-mail-send-line"></i>
        </div>
        <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">电子邮箱</h4>
        <p class="text-lg font-bold text-slate-700">support@ozonassist.co</p>
      </div>

      <div
        class="group p-8 bg-white border border-slate-100 rounded-[32px] flex flex-col items-center text-center transition-all hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2 cursor-pointer"
      >
        <div
          class="w-16 h-16 bg-blue-50 text-ozon-blue rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-ozon-blue group-hover:text-white transition-colors"
        >
          <i class="ri-customer-service-2-line"></i>
        </div>
        <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">在线支持</h4>
        <p class="text-lg font-bold text-slate-700">工作日 9:00 - 18:00</p>
      </div>

      <div
        class="group p-8 bg-white border border-slate-100 rounded-[32px] flex flex-col items-center text-center transition-all hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2 cursor-pointer"
      >
        <div
          class="w-16 h-16 bg-blue-50 text-ozon-blue rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-ozon-blue group-hover:text-white transition-colors"
        >
          <i class="ri-discord-line"></i>
        </div>
        <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
          Discord 社区
        </h4>
        <p class="text-lg font-bold text-slate-700">Ozon Assist Official</p>
      </div>
    </div>

    <div
      class="mt-24 pt-8 border-t border-slate-100 flex items-center justify-between shrink-0 italic"
    >
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
        服务时间: 周一至周五 09:00 - 18:00
      </p>
      <p class="text-[11px] font-bold text-ozon-blue uppercase tracking-tighter">
        Support @ Ozon Assist
      </p>
    </div>
  </div>
</template>
