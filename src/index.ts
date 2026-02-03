import { Hono } from 'hono'

type Env = {
  EXCHANGE_RATE: string
}

const app = new Hono<{ Bindings: Env }>()

interface PriceDetail {
  provider: string;
  name: string;
  input: number;      
  output: number;     
  cache_read?: number; 
  cache_write?: number; 
  currency: 'USD' | 'CNY';
  note?: string;      
}

const MANUAL_DATA: PriceDetail[] = [
  { provider: 'MiniMax', name: 'MiniMax-M2.1', input: 2.1, output: 8.4, cache_read: 0.21, cache_write: 2.625, currency: 'CNY' },
  { provider: 'DeepSeek', name: 'deepseek-chat', input: 2, output: 3, cache_read: 0.2, currency: 'CNY', note: 'V3.2' },
  { provider: 'DeepSeek', name: 'deepseek-reasoner', input: 2, output: 3, cache_read: 0.2, currency: 'CNY', note: 'V3.2' },
  { provider: 'Zhipu AI', name: 'GLM-4.7', input: 2, output: 8, cache_read: 0.4, currency: 'CNY', note: '0-32K' },
  { provider: 'Zhipu AI', name: 'GLM-4.6', input: 2, output: 8, cache_read: 0.4, currency: 'CNY', note: '0-32K' },
  { provider: 'Zhipu AI', name: 'GLM-4.5-Air', input: 0.8, output: 2, cache_read: 0.16, currency: 'CNY', note: '0-32K' },
  { provider: 'Zhipu AI', name: 'GLM-4.7-FlashX', input: 0.5, output: 3, cache_read: 0.1, currency: 'CNY' },
  { provider: 'Zhipu AI', name: 'GLM-4.7-Flash', input: 0, output: 0, cache_read: 0, currency: 'CNY', note: 'FREE' },
  { provider: 'xAI', name: 'grok-4-1-fast-reasoning', input: 0.2, output: 0.5, currency: 'USD' },
  { provider: 'xAI', name: 'grok-4-1-fast-non-reasoning', input: 0.2, output: 0.5, currency: 'USD' },
  { provider: 'Google', name: 'gemini-3-pro-preview', input: 2.0, output: 12.0, cache_read: 0.2, currency: 'USD', note: '<=200K' },
  { provider: 'Google', name: 'gemini-3-flash-preview', input: 0.5, output: 3.0, cache_read: 0.05, currency: 'USD' },
  { provider: 'Google', name: 'gemini-2.5-pro', input: 1.25, output: 10.0, cache_read: 0.125, currency: 'USD', note: '<=200K' },
  { provider: 'Google', name: 'gemini-2.5-flash', input: 0.3, output: 2.5, cache_read: 0.03, currency: 'USD' },
  { provider: 'Moonshot', name: 'kimi-k2.5', input: 4, output: 21, cache_read: 0.7, currency: 'CNY' }
]

app.get('/', async (c) => {
  const exchangeRate = parseFloat(c.env.EXCHANGE_RATE || '7.2')
  
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>LLM API 极简表</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; background: #fff; color: #000; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
        th, td { border: 1px solid #eee; padding: 4px 2px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        th { background: #f9f9f9; font-weight: bold; }
        .is-fav { background: #fffbeb; }
        .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; padding: 20px; }
        .modal.active { display: flex; }
        .modal-content { background: white; width: 100%; max-width: 400px; border-radius: 8px; padding: 15px; max-height: 80vh; overflow-y: auto; font-size: 12px; }
    </style>
</head>
<body>
    <div class="p-2 border-b flex justify-between items-center bg-gray-50">
        <span class="font-bold text-xs uppercase">LLM Price Index</span>
        <button onclick="toggleModal(true)" class="text-[10px] bg-black text-white px-2 py-1 rounded">SET</button>
    </div>

    <div class="overflow-x-auto">
        <table id="table">
            <thead>
                <tr>
                    <th style="width: 28%">Model</th>
                    <th style="width: 15%">In</th>
                    <th style="width: 15%">Out</th>
                    <th style="width: 15%">Hit</th>
                    <th style="width: 17%">Total</th>
                    <th style="width: 10%">Fav</th>
                </tr>
            </thead>
            <tbody id="list"></tbody>
        </table>
    </div>

    <div id="modal" class="modal" onclick="if(event.target==this) toggleModal(false)">
        <div class="modal-content" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-3">
                <span class="font-bold">Select Models</span>
                <button onclick="toggleModal(false)" class="text-gray-400">X</button>
            </div>
            <div id="settings-list" class="space-y-1"></div>
            <button onclick="save()" class="w-full bg-black text-white py-2 rounded mt-4">SAVE</button>
            <button onclick="reset()" class="w-full text-gray-400 py-2 mt-1">CLEAR ALL</button>
        </div>
    </div>

    <script>
        const raw = ${JSON.stringify(MANUAL_DATA)};
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
            toggleModal(false);
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
                document.getElementById('settings-list').innerHTML = raw.map(m => {
                    const id = \`\${m.provider}-\${m.name}\`.toLowerCase().replace(/\\s+/g, '-');
                    return \`
                        <label class="flex items-center gap-2 p-1 hover:bg-gray-50">
                            <input type="checkbox" value="\${id}" class="api-cb" \${favs.includes(id) ? 'checked' : ''}>
                            <span class="truncate">\${m.name}</span>
                        </label>
                    \`;
                }).join('');
            }
        }

        function render() {
            const favs = getFavs();
            const container = document.getElementById('list');
            
            let data = raw.map(m => {
                const id = \`\${m.provider}-\${m.name}\`.toLowerCase().replace(/\\s+/g, '-');
                const conv = (v) => m.currency === 'USD' ? v * rate : v;
                return { ...m, id, in: conv(m.input), out: conv(m.output), hit: m.cache_read !== undefined ? conv(m.cache_read) : null, total: conv(m.input) + conv(m.output) };
            });

            if (favs.length > 0) {
                data = data.filter(m => favs.includes(m.id));
            }

            data.sort((a, b) => a.total - b.total);

            container.innerHTML = data.map(m => \`
                <tr class="\${favs.includes(m.id) ? 'is-fav' : ''}">
                    <td class="text-left pl-1" title="\${m.name}">\${m.name}</td>
                    <td>\${m.in.toFixed(2)}</td>
                    <td>\${m.out.toFixed(2)}</td>
                    <td>\${m.hit !== null ? m.hit.toFixed(2) : '-'}</td>
                    <td class="font-bold">\${m.total.toFixed(2)}</td>
                    <td>\${favs.includes(m.id) ? '★' : ''}</td>
                </tr>
            \`).join('');
        }

        window.onload = render;
    </script>
</body>
</html>
  `
  return c.html(html)
})

export default app
