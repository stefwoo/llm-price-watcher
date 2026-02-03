import { Hono } from 'hono';
const app = new Hono();
// ==========================================
// 人工维护的价格清单 (根据用户提供的数据)
// ==========================================
const MANUAL_DATA = [
    // MiniMax
    { provider: 'MiniMax', name: 'MiniMax-M2.1', input: 2.1, output: 8.4, cache_read: 0.21, cache_write: 2.625, currency: 'CNY' },
    // DeepSeek
    { provider: 'DeepSeek', name: 'deepseek-chat', input: 2, output: 3, cache_read: 0.2, currency: 'CNY', note: 'V3.2' },
    { provider: 'DeepSeek', name: 'deepseek-reasoner', input: 2, output: 3, cache_read: 0.2, currency: 'CNY', note: 'V3.2' },
    // GLM (智谱)
    { provider: 'Zhipu AI', name: 'GLM-4.7', input: 2, output: 8, cache_read: 0.4, currency: 'CNY', note: '0-32K' },
    { provider: 'Zhipu AI', name: 'GLM-4.6', input: 2, output: 8, cache_read: 0.4, currency: 'CNY', note: '0-32K' },
    { provider: 'Zhipu AI', name: 'GLM-4.5-Air', input: 0.8, output: 2, cache_read: 0.16, currency: 'CNY', note: '0-32K' },
    { provider: 'Zhipu AI', name: 'GLM-4.7-FlashX', input: 0.5, output: 3, cache_read: 0.1, currency: 'CNY' },
    { provider: 'Zhipu AI', name: 'GLM-4.7-Flash', input: 0, output: 0, cache_read: 0, currency: 'CNY', note: 'FREE' },
    // xAI (Grok)
    { provider: 'xAI', name: 'grok-4-1-fast-reasoning', input: 0.2, output: 0.5, currency: 'USD' },
    { provider: 'xAI', name: 'grok-4-1-fast-non-reasoning', input: 0.2, output: 0.5, currency: 'USD' },
    // Google Gemini
    { provider: 'Google', name: 'gemini-3-pro-preview', input: 2.0, output: 12.0, cache_read: 0.2, currency: 'USD', note: '<=200K' },
    { provider: 'Google', name: 'gemini-3-flash-preview', input: 0.5, output: 3.0, cache_read: 0.05, currency: 'USD' },
    { provider: 'Google', name: 'gemini-2.5-pro', input: 1.25, output: 10.0, cache_read: 0.125, currency: 'USD', note: '<=200K' },
    { provider: 'Google', name: 'gemini-2.5-flash', input: 0.3, output: 2.5, cache_read: 0.03, currency: 'USD' },
    // Moonshot (Kimi)
    { provider: 'Moonshot', name: 'kimi-k2.5', input: 4, output: 21, cache_read: 0.7, currency: 'CNY' }
];
app.get('/', async (c) => {
    const exchangeRate = parseFloat(c.env.EXCHANGE_RATE || '7.2');
    const updatedAt = "2026-02-03 (人工核查)";
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LLM 价格看板 (人工维护)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap');
        body { font-family: 'Inter', system-ui, sans-serif; background-color: #f1f5f9; color: #0f172a; }
        .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: flex-end; backdrop-filter: blur(8px); }
        .modal.active { display: flex; }
        .modal-content { background: white; width: 100%; border-radius: 32px 32px 0 0; padding: 24px; max-height: 85vh; overflow-y: auto; }
        .item-fav { border-left: 6px solid #2563eb !important; background-color: #f8faff; }
        .badge { font-size: 8px; font-weight: 900; padding: 2px 6px; border-radius: 6px; text-transform: uppercase; }
        .badge-free { background: #10b981; color: white; }
        .badge-note { background: #e2e8f0; color: #64748b; }
    </style>
</head>
<body class="pb-12">
    <header class="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
            <h1 class="text-2xl font-[900] tracking-tighter italic">LLM INDEX</h1>
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">人 工 精 准 维 护 版</p>
        </div>
        <button onclick="toggleModal(true)" class="p-3 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-90 transition-all">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
        </button>
    </header>

    <main class="max-w-2xl mx-auto px-4 mt-6">
        <div id="filter-tag" class="mb-4 hidden">
          <div class="bg-blue-600 p-4 rounded-3xl flex justify-between items-center shadow-lg shadow-blue-100">
            <span class="text-[10px] font-black text-white uppercase tracking-widest italic">专注模式已启用</span>
            <button onclick="reset()" class="text-[10px] text-blue-100 font-bold underline">查看全量表</button>
          </div>
        </div>

        <div class="bg-white rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
            <div id="list" class="divide-y divide-slate-50">
                <!-- Data via JS -->
            </div>
        </div>
    </main>

    <div id="modal" class="modal" onclick="if(event.target==this) toggleModal(false)">
        <div class="modal-content shadow-2xl" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-black italic tracking-tighter">定制看板</h2>
                <button onclick="toggleModal(false)" class="text-slate-300 font-black">CLOSE</button>
            </div>
            <div id="settings-list" class="space-y-2 mb-8"></div>
            <button onclick="save()" class="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg active:scale-95 transition-all shadow-2xl">
                确 认 保 存
            </button>
        </div>
    </div>

    <footer class="mt-12 text-center text-[10px] text-slate-300 font-bold px-6 uppercase space-y-1">
      <p>汇率参考: 1 USD = ￥${exchangeRate}</p>
      <p>价格单位: ￥ / 每百万 TOKENS</p>
      <p>更新日期: ${updatedAt}</p>
    </footer>

    <script>
        const data = ${JSON.stringify(MANUAL_DATA)};
        const rate = ${exchangeRate};

        function getFavs() {
            try {
                const c = document.cookie.split('; ').find(r => r.startsWith('fav_apis='));
                return c ? JSON.parse(decodeURIComponent(c.split('=')[1])) : [];
            } catch (e) { return []; }
        }

        function reset() {
            document.cookie = "fav_apis=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            render();
        }

        function save() {
            const selected = Array.from(document.querySelectorAll('.api-cb:checked')).map(cb => cb.value);
            document.cookie = "fav_apis=" + encodeURIComponent(JSON.stringify(selected)) + "; max-age=31536000; path=/; SameSite=Lax";
            toggleModal(false);
            render();
        }

        function toggleModal(show) {
            document.getElementById('modal').classList.toggle('active', show);
            if (show) {
                const favs = getFavs();
                document.getElementById('settings-list').innerHTML = data.map(m => {
                    const id = \`\${m.provider}-\\n\${m.name}\`.toLowerCase().replace(/\\s+/g, '-');
                    return \`
                        <label class="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 cursor-pointer">
                            <div>
                                <div class="text-sm font-bold">\${m.name}</div>
                                <div class="text-[9px] text-slate-400 font-black tracking-widest uppercase">\${m.provider}</div>
                            </div>
                            <input type="checkbox" value="\${id}" class="api-cb w-6 h-6 rounded-lg text-blue-600 focus:ring-0" \${favs.includes(id) ? 'checked' : ''}>
                        </label>
                    \`;
                }).join('');
            }
        }

        function render() {
            const favs = getFavs();
            const container = document.getElementById('list');
            const filterBar = document.getElementById('filter-tag');

            let processed = data.map(m => {
                const id = \`\${m.provider}-\\n\${m.name}\`.toLowerCase().replace(/\\s+/g, '-');
                const conv = (v) => m.currency === 'USD' ? v * rate : v;
                return {
                    ...m,
                    id,
                    in: conv(m.input),
                    out: conv(m.output),
                    hit: m.cache_read !== undefined ? conv(m.cache_read) : null,
                    write: m.cache_write !== undefined ? conv(m.cache_write) : null,
                    total: conv(m.input) + conv(m.output)
                };
            });

            if (favs.length > 0) {
                processed = processed.filter(m => favs.includes(m.id));
                filterBar.classList.remove('hidden');
            } else {
                filterBar.classList.add('hidden');
            }

            processed.sort((a, b) => a.total - b.total);

            container.innerHTML = processed.map(m => \`
                <div class="p-6 md:p-8 flex flex-col gap-4 \${favs.includes(m.id) ? 'item-fav' : ''}">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-xl font-[900] tracking-tighter text-slate-900">\${m.name}</h3>
                                \${m.input === 0 ? '<span class="badge badge-free">FREE</span>' : ''}
                                \${m.note ? \`<span class="badge badge-note">\${m.note}</span>\` : ''}
                            </div>
                            <div class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">\${m.provider}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-[900] text-slate-900 tracking-tighter">￥\${m.total.toFixed(2)}</div>
                            <div class="text-[9px] text-slate-400 font-black uppercase tracking-widest">In+Out / 1M</div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div class="text-[8px] text-slate-400 font-bold mb-0.5">INPUT</div>
                            <div class="text-xs font-black text-slate-700">￥\${m.in.toFixed(3)}</div>
                        </div>
                        <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div class="text-[8px] text-slate-400 font-bold mb-0.5">OUTPUT</div>
                            <div class="text-xs font-black text-slate-700">￥\${m.out.toFixed(3)}</div>
                        </div>
                        \${m.hit !== null ? \`
                        <div class="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                            <div class="text-[8px] text-emerald-600 font-bold mb-0.5">CACHE HIT</div>
                            <div class="text-xs font-black text-emerald-700">￥\${m.hit.toFixed(3)}</div>
                        </div>
                        \` : ''}
                        \${m.write !== null ? \`
                        <div class="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                            <div class="text-[8px] text-amber-600 font-bold mb-0.5">CACHE WRITE</div>
                            <div class="text-xs font-black text-amber-700">￥\${m.write.toFixed(3)}</div>
                        </div>
                        \` : ''}
                    </div>
                </div>
            \`).join('');
        }

        window.onload = render;
    </script>
</body>
</html>
  `;
    return c.html(html);
});
export default app;
