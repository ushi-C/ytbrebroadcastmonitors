/* ══ 等比缩放 ══ */
const BASE_W = 1440, BASE_FS = 16;
let _stTimer = null;
function applyScale() {
  const fs = Math.min(20, Math.max(10, (window.innerWidth / BASE_W) * BASE_FS));
  document.documentElement.style.fontSize = fs.toFixed(3) + 'px';
  const tip = document.getElementById('scale-tip');
  tip.textContent = Math.round((fs / BASE_FS) * 100) + '%';
  tip.classList.add('show');
  clearTimeout(_stTimer);
  _stTimer = setTimeout(() => tip.classList.remove('show'), 1200);
}
window.addEventListener('resize', () => { applyScale(); relayout(); });
applyScale();

/* ══ Tab ══ */
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('view-' + name).classList.add('active');
  if (name === 'player') relayout();
}
document.getElementById('tab-monitor').addEventListener('click', () => switchTab('monitor'));
document.getElementById('tab-player').addEventListener('click', () => switchTab('player'));

/* ══ Toast ══ */
let _toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ══════════════════════════════════════════════════════
   核心：绝对定位布局引擎
   layout[] 记录当前存活的窗口 ID（顺序即显示顺序）
   关窗 = 从 layout[] 删除该 ID + remove DOM，其他窗口
   的 iframe.src 完全不动，只是坐标用 transition 平移
══════════════════════════════════════════════════════ */
const MAX_PLAYERS = 6;
let cardCount = 0;
let layoutCols = 1;
let layout = [];

const GAP  = 6;
const PAD  = 8;
const IFRAME_BASE_W = 1280;
const IFRAME_BASE_H = 720;
let ratioMode = {};

function calcSlots(n, cols, deskW, deskH) {
  if (n === 0) return [];
  const rows = Math.ceil(n / cols);
  const w = (deskW - PAD * 2 - GAP * (cols - 1)) / cols;
  const h = (deskH - PAD * 2 - GAP * (rows - 1)) / rows;
  return Array.from({length: n}, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { left: PAD + col * (w + GAP), top: PAD + row * (h + GAP), width: w, height: h };
  });
}

function relayout() {
  const desk = document.getElementById('desk');
  const dW = desk.clientWidth;
  const dH = desk.clientHeight;
  const n = layout.length;
  const cols = Math.min(layoutCols, n) || 1;
  const slots = calcSlots(n, cols, dW, dH);

  layout.forEach((id, i) => {
    const win = document.getElementById('card-' + id);
    if (!win) return;
    const s = slots[i];
    win.style.transition = 'none';
    win.style.width  = s.width  + 'px';
    win.style.height = s.height + 'px';
    void win.offsetWidth;
    win.style.transition = '';
    win.style.left = s.left + 'px';
    win.style.top  = s.top  + 'px';

    const ifr = document.getElementById('iframe-' + id);
    if (ifr) {
      const titleH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--title-h'))
                     * parseFloat(getComputedStyle(document.documentElement).fontSize);
      const ctrlH  = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ctrl-h'))
                     * parseFloat(getComputedStyle(document.documentElement).fontSize);
      const viewportH = Math.max(40, s.height - titleH - ctrlH);

      let baseW = 1280, baseH = 720;
      if (ratioMode[id] === 'portrait') { baseW = 720; baseH = 1280; }

      const scaleX = s.width / baseW;
      const scaleY = viewportH / baseH;
      const scale  = Math.min(scaleX, scaleY);
      const realW  = baseW * scale;
      const realH  = baseH * scale;
      const offsetX = s.left + (s.width - realW) / 2;
      const offsetY = s.top  + titleH + (viewportH - realH) / 2;

      ifr.style.width  = baseW + 'px';
      ifr.style.height = baseH + 'px';
      ifr.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }
  });
  document.getElementById('empty-hint').style.display = n === 0 ? 'block' : 'none';
}

function setLayoutCols(c) {
  layoutCols = c;
  ['1','2','3'].forEach(n =>
    document.getElementById('btn-col' + n).classList.toggle('active', Number(n) === c)
  );
  relayout();
}
document.getElementById('btn-col1').addEventListener('click', () => setLayoutCols(1));
document.getElementById('btn-col2').addEventListener('click', () => setLayoutCols(2));
document.getElementById('btn-col3').addEventListener('click', () => setLayoutCols(3));

/* ══ 工具函数 ══ */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function extractVideoID(url) {
  url = (url || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  const pats = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of pats) { const m = url.match(re); if (m) return m[1]; }
  return null;
}

function setStatus(id, msg, isErr) {
  const bar = document.getElementById('titlebar-' + id);
  if (!bar) return;
  bar.querySelector('.wm-title-text').textContent = '窗口 #' + id + (msg ? '  · ' + msg : '');
  bar.style.color = isErr ? '#ff6666' : '';
}

function updateBadge() {
  const n = layout.length;
  document.getElementById('countBadge').textContent = n + ' / ' + MAX_PLAYERS + ' 个窗口';
  document.getElementById('addBtn').disabled = n >= MAX_PLAYERS;
}

/* ══ 播放 ══ */
function loadVideo(id) {
  const url = (document.getElementById('url-' + id) || {}).value || '';
  const vid = extractVideoID(url);
  if (!vid) { setStatus(id, '无效链接', true); return; }
  const host = id % 2 === 0 ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
  const src  = `${host}/embed/${vid}?autoplay=1&enablejsapi=1&playsinline=1`;
  document.getElementById('iframe-' + id).src = src;
  document.getElementById('placeholder-' + id).classList.add('hidden');
  setStatus(id, '播放中');
}

function refreshOne(id) {
  const ifr = document.getElementById('iframe-' + id);
  if (!ifr) return;
  const src = ifr.src;
  if (!src || src === 'about:blank' || (!src.includes('youtube.com') && !src.includes('youtube-nocookie.com'))) {
    setStatus(id, '未加载视频', true); return;
  }
  ifr.src = 'about:blank';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ifr.src = src;
    setStatus(id, '已刷新');
  }));
}

function refreshAll() {
  if (!layout.length) { showToast('没有播放窗口'); return; }
  layout.forEach((id, i) => setTimeout(() => refreshOne(id), i * 300));
  showToast('正在刷新全部窗口…');
}

function setVolume(id, val) {
  const v = parseInt(val);
  const icon = document.getElementById('vol-icon-' + id);
  if (icon) icon.textContent = v === 0 ? '🔇' : v < 50 ? '🔉' : '🔊';
  const ifr = document.getElementById('iframe-' + id);
  if (!ifr || !ifr.src || ifr.src === 'about:blank') return;
  try {
    ifr.contentWindow.postMessage(
      JSON.stringify({event:'command', func:'setVolume', args:[v]}), '*');
  } catch(e) {}
}

/* ══ 添加播放窗口 ══ */
function addPlayer(initUrl) {
  if (layout.length >= MAX_PLAYERS) return null;
  const id = ++cardCount;
  ratioMode[id] = 'landscape';

  const win = document.createElement('div');
  win.className = 'wm-window';
  win.id = 'card-' + id;
  win.style.left = '100%';
  win.style.top  = '100%';
  win.style.width  = '0';
  win.style.height = '0';

  win.innerHTML = `
    <div class="wm-titlebar" id="titlebar-${id}">
      <span class="wm-drag-handle" title="拖拽换位">⠿</span>
      <span class="wm-title-text">窗口 #${id}</span>
    </div>
    <div class="wm-viewport">
      <div id="placeholder-${id}" class="video-placeholder">
        <svg width="40" height="40" viewBox="0 0 24 24">
          <rect width="24" height="24" rx="4" fill="#ff0000"/>
          <polygon points="10,8 16,12 10,16" fill="#fff"/>
        </svg>
        <span>YouTube Live</span>
      </div>
    </div>
    <div class="card-controls">
      <input class="url-input" id="url-${id}" type="text" placeholder="输入 YouTube 直播链接…">
      <button class="c-btn play" type="button">播放</button>
      <button class="c-btn ref" type="button" title="刷新本窗">↻</button>
      <button class="c-btn ratio" type="button" title="横竖切换">纵</button>
      <div class="vol-wrap">
        <span class="vol-icon" id="vol-icon-${id}">🔊</span>
        <input class="vol-slider" type="range" min="0" max="100" value="100"
               oninput="setVolume(${id}, this.value)">
      </div>
      <button class="c-btn cls" type="button" title="关闭">✕</button>
    </div>
  `;

  document.getElementById('desk').appendChild(win);

  const iframeLayer = document.createElement('iframe');
  iframeLayer.id        = 'iframe-' + id;
  iframeLayer.className = 'wm-iframe-layer';
  iframeLayer.src       = 'about:blank';
  iframeLayer.setAttribute('allow', 'autoplay; fullscreen');
  iframeLayer.setAttribute('referrerpolicy', 'origin');
  iframeLayer.setAttribute('allowfullscreen', 'true');
  document.getElementById('desk').appendChild(iframeLayer);

  win.querySelector('.c-btn.play').addEventListener('click', () => loadVideo(id));
  win.querySelector('.c-btn.ref').addEventListener('click', () => refreshOne(id));
  win.querySelector('.c-btn.ratio').addEventListener('click', function () {
    if (ratioMode[id] === 'portrait') {
      ratioMode[id] = 'landscape'; this.textContent = '纵'; setStatus(id, '横屏模式');
    } else {
      ratioMode[id] = 'portrait';  this.textContent = '横'; setStatus(id, '竖屏模式');
    }
    relayout();
  });
  win.querySelector('.c-btn.cls').addEventListener('click', () => removePlayer(id));
  win.querySelector('.url-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') loadVideo(id);
  });

  /* 拖拽换位 */
  win.querySelector('.wm-drag-handle').addEventListener('mousedown', function (e) {
    e.preventDefault();
    const fromIndex = layout.indexOf(id);
    if (fromIndex === -1) return;

    function onMouseUp(ev) {
      document.removeEventListener('mouseup', onMouseUp);
      const desk     = document.getElementById('desk');
      const deskRect = desk.getBoundingClientRect();
      const x = ev.clientX - deskRect.left;
      const y = ev.clientY - deskRect.top;
      const total = layout.length;
      const cols  = Math.min(layoutCols, total) || 1;
      const slots = calcSlots(total, cols, desk.clientWidth, desk.clientHeight);
      let targetIndex = fromIndex;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (x >= s.left && x <= s.left + s.width && y >= s.top && y <= s.top + s.height) {
          targetIndex = i; break;
        }
      }
      if (targetIndex !== fromIndex) {
        const moved = layout.splice(fromIndex, 1)[0];
        layout.splice(targetIndex, 0, moved);
        relayout();
      }
    }
    document.addEventListener('mouseup', onMouseUp);
  });

  layout.push(id);
  relayout();
  updateBadge();

  if (initUrl) {
    document.getElementById('url-' + id).value = initUrl;
    loadVideo(id);
  }
  return id;
}

function removePlayer(id) {
  const idx = layout.indexOf(id);
  if (idx !== -1) layout.splice(idx, 1);
  const win = document.getElementById('card-' + id);
  if (win) win.remove();
  const ifr = document.getElementById('iframe-' + id);
  if (ifr) ifr.remove();
  relayout();
  updateBadge();
}

/* ══ MONITOR ══ */
let monPolling = null;
let scanRenderedKeys   = new Set();
let searchRenderedKeys = new Set();

async function monStartScan() {
  clearInterval(monPolling); monPolling = null;
  scanRenderedKeys   = new Set();
  searchRenderedKeys = new Set();
  document.getElementById('mon-grid').innerHTML = '';

  const btn  = document.getElementById('mon-btn');
  const prog = document.getElementById('mon-progress');
  btn.disabled = true;
  prog.textContent = '正在启动扫描…';

  try {
    await fetch('/api/refresh', {method:'POST'});
  } catch(e) {
    prog.textContent = '后端未连接 (需启动 uvicorn)';
    btn.disabled = false;
    return;
  }

  setTimeout(() => {
    monPolling = setInterval(monCheckStatus, 2000);
    monCheckStatus();
  }, 800);
}

async function monCheckStatus() {
  try {
    const res   = await fetch('/api/status');
    const state = await res.json();
    const btn   = document.getElementById('mon-btn');
    const prog  = document.getElementById('mon-progress');
    monRenderIncremental(state.results || []);
    if (state.is_running) {
      btn.disabled = true;
      prog.textContent = `检测中: ${state.progress} / ${state.total}`;
      if (!monPolling) monPolling = setInterval(monCheckStatus, 2000);
    } else {
      btn.disabled = false;
      clearInterval(monPolling); monPolling = null;
      const n = state.results ? state.results.length : 0;
      prog.textContent = n ? `检测完成 (共 ${n} 个直播)` : `上次: 0 个直播`;
    }
  } catch(e) {
    document.getElementById('mon-progress').textContent = '后端未连接 (需启动 uvicorn)';
    clearInterval(monPolling); monPolling = null;
    document.getElementById('mon-btn').disabled = false;
  }
}

function monItemKey(i) {
  return (i && (i.url || i.id || (i.name + '|' + i.title))) || Math.random().toString(36);
}

/* ── 直播标题三块解析 ── */
function parseLiveTitleBlocks(title) {
  title = title || '';
  title = title
    .replace(/[\s\-\/]*\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, '')
    .replace(/[\s\-\/]*\d{8}$/, '')
    .trim();

  const alnum   = 'a-zA-Z0-9\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff';
  const alnumRe = new RegExp(`[${alnum}]+`, 'g');
  const tagRe   = new RegExp(`#[${alnum}]+`, 'g');
  const tags    = title.match(tagRe) || [];
  const block3  = tags.length ? tags.join(' ') : '#LIVE';

  const bracketRe = /([【〖『].*?[】〗』])/g;
  const brackets  = [...title.matchAll(bracketRe)];
  let block1 = '';

  for (const b of brackets) {
    let content = b[0].slice(1, -1);
    tags.forEach(t => { content = content.replace(t, ''); });
    const cleaned = (content.match(alnumRe) || []).join('');
    if (cleaned) { block1 = cleaned; break; }
  }
  if (!block1) block1 = 'LIVE';

  let temp = title;
  [...brackets].reverse().forEach(b => {
    temp = temp.slice(0, b.index) + temp.slice(b.index + b[0].length);
  });
  tags.forEach(t => { temp = temp.replace(t, ''); });

  const block2Re = new RegExp(`[${alnum}！？!?]+`, 'g');
  const block2   = ((temp.match(block2Re) || []).join('').trim()).replace(/\d{8,14}$/, '');

  return { block1, block2, block3 };
}

function _buildMonCard(i) {
  const card  = document.createElement('div');
  card.className = 'mon-card';
  const uid = i.id || Math.random().toString(36).slice(2);
  const ytIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ytpink${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ffb3d9"/>
        <stop offset="100%" style="stop-color:#d86fff"/>
      </linearGradient>
    </defs>
    <path fill="url(#ytpink${uid})" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12
      3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0
      12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505
      0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545
      15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>`;

  const tb = parseLiveTitleBlocks(i.title || '');
  const avatarInner = i.avatar
    ? `<img class="mon-card-img" src="${escapeHtml(i.avatar)}" alt="" onerror="this.style.display='none'">`
    : '';

  card.innerHTML = `<div class="mon-card-inner">
    <div class="mon-card-top">
      <div class="mon-card-img-wrap">${avatarInner}</div>
      <div class="mon-card-info">
        <div class="mon-card-name">${escapeHtml(i.name||'')}</div>
        <div class="mon-title-blocks">
          <span class="mon-tb1">${escapeHtml(tb.block1)}</span>
          <span class="mon-tb2">${escapeHtml(tb.block2)}</span>
          <span class="mon-tb3">${escapeHtml(tb.block3)}</span>
        </div>
      </div>
      <a class="mon-open-btn" href="${escapeHtml(i.url||'#')}"
         target="_blank" title="在 YouTube 打开" onclick="event.stopPropagation()">${ytIcon}</a>
    </div>
    <div class="mon-card-bottom">
      <span class="mon-live-badge"><span class="mon-live-dot"></span>LIVE <span style="color:rgba(255,255,255,.85);font-weight:400;margin-left:0.15rem">直播中</span></span>
      <button class="mon-send-btn" type="button">窗口播放 <span style="color:#ff8fab">▶</span></button>
    </div>
  </div>`;

  card.querySelector('.mon-send-btn').addEventListener('click', e => {
    e.stopPropagation();
    sendToPlayer(i.url, i.name);
  });
  return card;
}

function monRenderIncremental(data) {
  const grid  = document.getElementById('mon-grid');
  const items = Array.isArray(data) ? data : [];
  for (const i of items) {
    const key = monItemKey(i);
    if (scanRenderedKeys.has(key) || searchRenderedKeys.has(key)) continue;
    scanRenderedKeys.add(key);
    grid.appendChild(_buildMonCard(i));
  }
}

function sendToPlayer(url, name) {
  if (layout.length >= MAX_PLAYERS) {
    showToast('播放器已满 (最多 ' + MAX_PLAYERS + ' 个窗口)'); return;
  }
  addPlayer(url);
  switchTab('player');
  showToast('已添加: ' + (name || url));
}

/* ══ Init ══ */
document.getElementById('addBtn').addEventListener('click', () => addPlayer());
document.getElementById('btnRefreshAll').addEventListener('click', refreshAll);
document.getElementById('mon-btn').addEventListener('click', monStartScan);

updateBadge();
relayout();
monCheckStatus();

/* ══════════════════════════════════════════════════════
   频道搜索模块
══════════════════════════════════════════════════════ */

function loadScript(src, onLoad) {
  const s = document.createElement('script');
  s.src = src; s.onload = onLoad; document.head.appendChild(s);
}

let _csvChannels = [];
let _fuse = null;

function initSearch() {
  fetch('/api/channels')
    .then(r => r.json())
    .then(data => {
      _csvChannels = (data.channels || []).map(r => ({
        id:     r.id    || '',
        url:    r.url   || '',
        title:  r.title || '',
        handle: _extractHandleFromUrl(r.url || ''),
      }));
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/fuse.js/7.0.0/fuse.min.js', () => {
        _fuse = new Fuse(_csvChannels, {
          keys: ['title'],
          threshold: 0.5,
          includeScore: true,
          minMatchCharLength: 1,
        });
      });
    })
    .catch(() => {});
}

function _extractHandleFromUrl(url) {
  if (!url) return '';
  const m = url.match(/\/@([^/?#]+)/);
  return m ? '@' + m[1] : '';
}

/* ── 搜索输入处理 ── */
const _searchInput    = document.getElementById('search-input');
const _searchClear    = document.getElementById('search-clear');
const _searchDropdown = document.getElementById('search-dropdown');

const _checkCache = new Map();
const _checking   = new Set();

_searchInput.addEventListener('input', _onSearchInput);
_searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') _closeDropdown(); });
_searchInput.addEventListener('focus', () => { if (_searchInput.value.trim()) _onSearchInput(); });
_searchClear.addEventListener('click', () => {
  _searchInput.value = '';
  _searchClear.classList.remove('visible');
  _closeDropdown();
  _searchInput.focus();
});

document.addEventListener('click', e => {
  if (!document.getElementById('search-wrap').contains(e.target) &&
      !_searchDropdown.contains(e.target)) {
    _closeDropdown();
  }
});

let _searchTimer = null;
function _onSearchInput() {
  const q = _searchInput.value.trim();
  _searchClear.classList.toggle('visible', q.length > 0);
  clearTimeout(_searchTimer);
  if (!q) { _closeDropdown(); return; }
  _searchTimer = setTimeout(() => _runSearch(q), 120);
}

function _closeDropdown() {
  _searchDropdown.style.display = 'none';
  _searchDropdown.innerHTML = '';
}

function _openDropdown() {
  const toolbar  = document.querySelector('.monitor-toolbar');
  const view     = document.getElementById('view-monitor');
  const tbBottom = toolbar.getBoundingClientRect().bottom;
  const vTop     = view.getBoundingClientRect().top;
  _searchDropdown.style.top     = (tbBottom - vTop) + 'px';
  _searchDropdown.style.display = 'block';
}

function _runSearch(q) {
  if (!_fuse || !_csvChannels.length) { _renderDropdownDirect(q); return; }
  const hits = _fuse.search(q).slice(0, 8).map(r => r.item);
  hits.length === 0 ? _renderDropdownDirect(q) : _renderDropdownResults(q, hits);
}

function _renderDropdownResults(q, hits) {
  _searchDropdown.innerHTML = '';
  const hdr = document.createElement('div');
  hdr.className   = 'sd-section-header';
  hdr.textContent = `找到 ${hits.length} 个频道，点击检测直播状态`;
  _searchDropdown.appendChild(hdr);
  for (const ch of hits) _searchDropdown.appendChild(_buildSdItem(ch));
  _searchDropdown.appendChild(_buildSdDirectItem(q));
  _openDropdown();
}

function _renderDropdownDirect(q) {
  _searchDropdown.innerHTML = '';
  const empty = document.createElement('div');
  empty.className   = 'sd-empty';
  empty.textContent = '没有匹配的频道';
  _searchDropdown.appendChild(empty);
  _searchDropdown.appendChild(_buildSdDirectItem(q));
  _openDropdown();
}

function _buildSdItem(ch) {
  const item = document.createElement('div');
  item.className      = 'sd-item';
  item.dataset.cacheKey = ch.id || ch.url;

  const displayName = ch.title || ch.handle || ch.id;
  const metaText    = ch.id || ch.url || '';

  item.innerHTML = `
    <div class="sd-avatar-placeholder" id="sdph-${escapeHtml(ch.id)}">▶</div>
    <img class="sd-avatar" id="sdav-${escapeHtml(ch.id)}" alt="" onerror="this.style.display='none'">
    <div class="sd-info">
      <div class="sd-name">${escapeHtml(displayName)}</div>
      <div class="sd-meta">${escapeHtml(metaText)}</div>
    </div>
    <span class="sd-badge offline" id="sdbadge-${escapeHtml(ch.id)}">未检测</span>
    <button class="sd-check-btn" type="button">开始检测</button>
    <button class="sd-send-btn" id="sdsend-${escapeHtml(ch.id)}"
            style="display:none" title="发送到播放器" type="button">▶</button>`;

  item.querySelector('.sd-check-btn').addEventListener('click', e => {
    e.stopPropagation();
    _checkChannel(ch, item);
  });
  _applyCheckCache(ch, item);
  return item;
}

function _buildSdDirectItem(q) {
  const item = document.createElement('div');
  item.className    = 'sd-item';
  item.style.opacity = '0.75';
  item.innerHTML = `
    <div class="sd-avatar-placeholder">🔍</div>
    <div class="sd-info">
      <div class="sd-name">直接检测: ${escapeHtml(q)}</div>
      <div class="sd-meta">将 "${escapeHtml(q)}" 作为 URL 或 ID 检测直播状态</div>
    </div>
    <span class="sd-badge offline">未检测</span>
    <button class="sd-check-btn" type="button">开始检测</button>`;

  item.querySelector('.sd-check-btn').addEventListener('click', e => {
    e.stopPropagation();
    _checkChannel({ id: q, url: q, title: '' }, item);
  });
  return item;
}

function _applyCheckCache(ch, item) {
  const cached = _checkCache.get(ch.id || ch.url);
  if (cached) _updateSdItemWithResult(ch, item, cached.result);
}

async function _checkChannel(ch, item) {
  const key    = ch.id || ch.url;
  const cached = _checkCache.get(key);
  if (cached && (Date.now() - cached.ts < 5 * 60 * 1000)) {
    _updateSdItemWithResult(ch, item, cached.result); return;
  }
  if (_checking.has(key)) return;
  _checking.add(key);

  const badge = item.querySelector('.sd-badge') || item.querySelector(`#sdbadge-${CSS.escape(ch.id)}`);
  if (badge) { badge.className = 'sd-badge checking'; badge.textContent = '检测中…'; }

  const query = (ch.id && ch.id.startsWith('UC')) ? ch.id : (ch.url || ch.id);
  try {
    const resp = await fetch('/api/check', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ query, title: ch.title || '' }),
    });
    const data   = await resp.json();
    const result = data.result || null;
    _checkCache.set(key, {result, ts: Date.now()});
    _updateSdItemWithResult(ch, item, result);
  } catch(e) {
    if (badge) { badge.className = 'sd-badge offline'; badge.textContent = '连接失败'; }
  } finally {
    _checking.delete(key);
  }
}

function _updateSdItemWithResult(ch, item, result) {
  const badge   = item.querySelector('.sd-badge') || document.getElementById(`sdbadge-${CSS.escape(ch.id)}`);
  const sendBtn = item.querySelector('.sd-send-btn') || document.getElementById(`sdsend-${CSS.escape(ch.id)}`);

  if (result) {
    if (badge)   { badge.className = 'sd-badge live'; badge.textContent = '🔴 直播中'; }
    if (sendBtn) { sendBtn.style.display = 'flex'; }

    if (result.avatar) {
      const avPh  = item.querySelector('.sd-avatar-placeholder');
      const avImg = item.querySelector('.sd-avatar');
      if (avImg) {
        avImg.src    = result.avatar;
        avImg.onload = () => { avImg.classList.add('loaded'); if (avPh) avPh.style.display = 'none'; };
      }
    }

    const nameEl = item.querySelector('.sd-name');
    const metaEl = item.querySelector('.sd-meta');
    if (nameEl && result.name)  nameEl.textContent = result.name;
    if (metaEl && result.title) metaEl.textContent = result.title;

    monAddLiveCard(result);

    if (sendBtn) {
      sendBtn.onclick = e => {
        e.stopPropagation();
        sendToPlayer(result.url, result.name);
        _closeDropdown();
      };
    }
    item.onclick = e => {
      if (e.target.closest('.sd-send-btn')) return;
      window.open(result.url, '_blank');
    };
  } else {
    if (badge)   { badge.className = 'sd-badge offline'; badge.textContent = '未直播'; }
    if (sendBtn) sendBtn.style.display = 'none';
  }
}

function monAddLiveCard(liveInfo) {
  const key = monItemKey(liveInfo);
  if (searchRenderedKeys.has(key) || scanRenderedKeys.has(key)) return;
  searchRenderedKeys.add(key);
  const grid = document.getElementById('mon-grid');
  grid.insertBefore(_buildMonCard(liveInfo), grid.firstChild);
}

initSearch();
