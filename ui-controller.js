(function (global) {
  const S = global.AppState;
  const U = global.DomUtils;
  const P = global.PlayerManager;
  const Api = global.ApiClient;

  const BASE_W = 1440, BASE_FS = 16;
  const poller = Api.createStatusPoller(monCheckStatus);

  function applyScale() {
    const fs = Math.min(20, Math.max(10, (window.innerWidth / BASE_W) * BASE_FS));
    document.documentElement.style.fontSize = fs.toFixed(3) + 'px';
    const tip = document.getElementById('scale-tip');
    tip.textContent = Math.round((fs / BASE_FS) * 100) + '%';
    tip.classList.add('show');
    clearTimeout(S.stTimer);
    S.stTimer = setTimeout(() => tip.classList.remove('show'), 1200);
  }

  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.getElementById('view-' + name).classList.add('active');
    if (name === 'player') P.relayout();
  }

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function _buildMonCard(i) {
    const card = document.createElement('div');
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

    const tb = U.parseLiveTitleBlocks(i.title || '');
    const avatarInner = i.avatar
      ? `<img class="mon-card-img" src="${U.escapeHtml(i.avatar)}" alt="" onerror="this.style.display='none'">`
      : '';

    card.innerHTML = `<div class="mon-card-inner">
    <div class="mon-card-top">
      <div class="mon-card-img-wrap">${avatarInner}</div>
      <div class="mon-card-info">
        <div class="mon-card-name">${U.escapeHtml(i.name || '')}</div>
        <div class="mon-title-blocks">
          <span class="mon-tb1">${U.escapeHtml(tb.block1)}</span>
          <span class="mon-tb2">${U.escapeHtml(tb.block2)}</span>
          <span class="mon-tb3">${U.escapeHtml(tb.block3)}</span>
        </div>
      </div>
      <a class="mon-open-btn" href="${U.escapeHtml(i.url || '#')}"
         target="_blank" title="在 YouTube 打开" onclick="event.stopPropagation()">${ytIcon}</a>
    </div>
    <div class="mon-card-bottom">
      <span class="mon-live-badge"><span class="mon-live-dot"></span>LIVE <span style="color:rgba(255,255,255,.85);font-weight:400;margin-left:0.15rem">直播中</span></span>
      <button class="mon-send-btn" type="button">窗口播放 <span style="color:#ff8fab">▶</span></button>
    </div>
  </div>`;

    card.querySelector('.mon-send-btn').addEventListener('click', e => {
      e.stopPropagation();
      P.sendToPlayer(i.url, i.name);
    });
    return card;
  }

  function monRenderIncremental(data) {
    const grid = document.getElementById('mon-grid');
    const items = Array.isArray(data) ? data : [];
    for (const i of items) {
      const key = U.monItemKey(i);
      if (S.scanRenderedKeys.has(key) || S.searchRenderedKeys.has(key)) continue;
      S.scanRenderedKeys.add(key);
      grid.appendChild(_buildMonCard(i));
    }
  }

  async function monStartScan() {
    poller.stop();
    S.monPolling = null;
    S.scanRenderedKeys = new Set();
    S.searchRenderedKeys = new Set();
    document.getElementById('mon-grid').innerHTML = '';

    const btn = document.getElementById('mon-btn');
    const prog = document.getElementById('mon-progress');
    btn.disabled = true;
    prog.textContent = '正在启动扫描…';

    try {
      await Api.refreshScan();
    } catch (e) {
      prog.textContent = '后端未连接 (需启动 uvicorn)';
      btn.disabled = false;
      return;
    }

    setTimeout(() => {
      S.monPolling = poller.start();
      monCheckStatus();
    }, 800);
  }

  async function monCheckStatus() {
    try {
      const state = await Api.getStatus();
      const btn = document.getElementById('mon-btn');
      const prog = document.getElementById('mon-progress');
      monRenderIncremental(state.results || []);
      if (state.is_running) {
        btn.disabled = true;
        prog.textContent = `检测中: ${state.progress} / ${state.total}`;
        if (!poller.getTimer()) S.monPolling = poller.start();
      } else {
        btn.disabled = false;
        S.monPolling = poller.stop();
        const n = state.results ? state.results.length : 0;
        prog.textContent = n ? `检测完成 (共 ${n} 个直播)` : `上次: 0 个直播`;
      }
    } catch (e) {
      document.getElementById('mon-progress').textContent = '后端未连接 (需启动 uvicorn)';
      S.monPolling = poller.stop();
      document.getElementById('mon-btn').disabled = false;
    }
  }

  function monAddLiveCard(liveInfo) {
    const key = U.monItemKey(liveInfo);
    if (S.searchRenderedKeys.has(key) || S.scanRenderedKeys.has(key)) return;
    S.searchRenderedKeys.add(key);
    const grid = document.getElementById('mon-grid');
    grid.insertBefore(_buildMonCard(liveInfo), grid.firstChild);
  }

  function loadScript(src, onLoad) {
    const s = document.createElement('script');
    s.src = src; s.onload = onLoad; document.head.appendChild(s);
  }

  function _extractHandleFromUrl(url) {
    if (!url) return '';
    const m = url.match(/\/@([^/?#]+)/);
    return m ? '@' + m[1] : '';
  }

  function initSearch() {
    Api.getChannels()
      .then(data => {
        S.csvChannels = (data.channels || []).map(r => ({
          id: r.id || '',
          url: r.url || '',
          title: r.title || '',
          handle: _extractHandleFromUrl(r.url || ''),
        }));
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/fuse.js/7.0.0/fuse.min.js', () => {
          S.fuse = new Fuse(S.csvChannels, {
            keys: ['title'],
            threshold: 0.5,
            includeScore: true,
            minMatchCharLength: 1,
          });
        });
      })
      .catch(() => {});
  }

  const _searchInput = document.getElementById('search-input');
  const _searchClear = document.getElementById('search-clear');
  const _searchDropdown = document.getElementById('search-dropdown');

  function _closeDropdown() {
    _searchDropdown.style.display = 'none';
    _searchDropdown.innerHTML = '';
  }

  function _openDropdown() {
    const toolbar = document.querySelector('.monitor-toolbar');
    const view = document.getElementById('view-monitor');
    const tbBottom = toolbar.getBoundingClientRect().bottom;
    const vTop = view.getBoundingClientRect().top;
    _searchDropdown.style.top = (tbBottom - vTop) + 'px';
    _searchDropdown.style.display = 'block';
  }

  function _renderDropdownResults(q, hits) {
    _searchDropdown.innerHTML = '';
    const hdr = document.createElement('div');
    hdr.className = 'sd-section-header';
    hdr.textContent = `找到 ${hits.length} 个频道，点击检测直播状态`;
    _searchDropdown.appendChild(hdr);
    for (const ch of hits) _searchDropdown.appendChild(_buildSdItem(ch));
    _searchDropdown.appendChild(_buildSdDirectItem(q));
    _openDropdown();
  }

  function _renderDropdownDirect(q) {
    _searchDropdown.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'sd-empty';
    empty.textContent = '没有匹配的频道';
    _searchDropdown.appendChild(empty);
    _searchDropdown.appendChild(_buildSdDirectItem(q));
    _openDropdown();
  }

  function _runSearch(q) {
    if (!S.fuse || !S.csvChannels.length) { _renderDropdownDirect(q); return; }
    const hits = S.fuse.search(q).slice(0, 8).map(r => r.item);
    hits.length === 0 ? _renderDropdownDirect(q) : _renderDropdownResults(q, hits);
  }

  function _onSearchInput() {
    const q = _searchInput.value.trim();
    _searchClear.classList.toggle('visible', q.length > 0);
    clearTimeout(S.searchTimer);
    if (!q) { _closeDropdown(); return; }
    S.searchTimer = setTimeout(() => _runSearch(q), 120);
  }

  function _applyCheckCache(ch, item) {
    const cached = S.checkCache.get(ch.id || ch.url);
    if (cached) _updateSdItemWithResult(ch, item, cached.result);
  }

  function _buildSdItem(ch) {
    const item = document.createElement('div');
    item.className = 'sd-item';
    item.dataset.cacheKey = ch.id || ch.url;

    const displayName = ch.title || ch.handle || ch.id;
    const metaText = ch.id || ch.url || '';

    item.innerHTML = `
    <div class="sd-avatar-placeholder" id="sdph-${U.escapeHtml(ch.id)}">▶</div>
    <img class="sd-avatar" id="sdav-${U.escapeHtml(ch.id)}" alt="" onerror="this.style.display='none'">
    <div class="sd-info">
      <div class="sd-name">${U.escapeHtml(displayName)}</div>
      <div class="sd-meta">${U.escapeHtml(metaText)}</div>
    </div>
    <span class="sd-badge offline" id="sdbadge-${U.escapeHtml(ch.id)}">未检测</span>
    <button class="sd-check-btn" type="button">开始检测</button>
    <button class="sd-send-btn" id="sdsend-${U.escapeHtml(ch.id)}"
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
    item.className = 'sd-item';
    item.style.opacity = '0.75';
    item.innerHTML = `
    <div class="sd-avatar-placeholder">🔍</div>
    <div class="sd-info">
      <div class="sd-name">直接检测: ${U.escapeHtml(q)}</div>
      <div class="sd-meta">将 "${U.escapeHtml(q)}" 作为 URL 或 ID 检测直播状态</div>
    </div>
    <span class="sd-badge offline">未检测</span>
    <button class="sd-check-btn" type="button">开始检测</button>`;

    item.querySelector('.sd-check-btn').addEventListener('click', e => {
      e.stopPropagation();
      _checkChannel({ id: q, url: q, title: '' }, item);
    });
    return item;
  }

  async function _checkChannel(ch, item) {
    const key = ch.id || ch.url;
    const cached = S.checkCache.get(key);
    if (cached && (Date.now() - cached.ts < 5 * 60 * 1000)) {
      _updateSdItemWithResult(ch, item, cached.result); return;
    }
    if (S.checking.has(key)) return;
    S.checking.add(key);

    const badge = item.querySelector('.sd-badge') || item.querySelector(`#sdbadge-${CSS.escape(ch.id)}`);
    if (badge) { badge.className = 'sd-badge checking'; badge.textContent = '检测中…'; }

    const query = (ch.id && ch.id.startsWith('UC')) ? ch.id : (ch.url || ch.id);
    try {
      const data = await Api.checkChannel(query, ch.title || '');
      const result = data.result || null;
      S.checkCache.set(key, { result, ts: Date.now() });
      _updateSdItemWithResult(ch, item, result);
    } catch (e) {
      if (badge) { badge.className = 'sd-badge offline'; badge.textContent = '连接失败'; }
    } finally {
      S.checking.delete(key);
    }
  }

  function _updateSdItemWithResult(ch, item, result) {
    const badge = item.querySelector('.sd-badge') || document.getElementById(`sdbadge-${CSS.escape(ch.id)}`);
    const sendBtn = item.querySelector('.sd-send-btn') || document.getElementById(`sdsend-${CSS.escape(ch.id)}`);

    if (result) {
      if (badge) { badge.className = 'sd-badge live'; badge.textContent = '🔴 直播中'; }
      if (sendBtn) { sendBtn.style.display = 'flex'; }

      if (result.avatar) {
        const avPh = item.querySelector('.sd-avatar-placeholder');
        const avImg = item.querySelector('.sd-avatar');
        if (avImg) {
          avImg.src = result.avatar;
          avImg.onload = () => { avImg.classList.add('loaded'); if (avPh) avPh.style.display = 'none'; };
        }
      }

      const nameEl = item.querySelector('.sd-name');
      const metaEl = item.querySelector('.sd-meta');
      if (nameEl && result.name) nameEl.textContent = result.name;
      if (metaEl && result.title) metaEl.textContent = result.title;

      monAddLiveCard(result);

      if (sendBtn) {
        sendBtn.onclick = e => {
          e.stopPropagation();
          P.sendToPlayer(result.url, result.name);
          _closeDropdown();
        };
      }
      item.onclick = e => {
        if (e.target.closest('.sd-send-btn')) return;
        window.open(result.url, '_blank');
      };
    } else {
      if (badge) { badge.className = 'sd-badge offline'; badge.textContent = '未直播'; }
      if (sendBtn) sendBtn.style.display = 'none';
    }
  }

  function bindEvents() {
    window.addEventListener('resize', () => { applyScale(); P.relayout(); });
    document.getElementById('tab-monitor').addEventListener('click', () => switchTab('monitor'));
    document.getElementById('tab-player').addEventListener('click', () => switchTab('player'));

    document.getElementById('btn-col1').addEventListener('click', () => P.setLayoutCols(1));
    document.getElementById('btn-col2').addEventListener('click', () => P.setLayoutCols(2));
    document.getElementById('btn-col3').addEventListener('click', () => P.setLayoutCols(3));

    document.getElementById('addBtn').addEventListener('click', () => P.addPlayer());
    document.getElementById('btnRefreshAll').addEventListener('click', P.refreshAll);
    document.getElementById('mon-btn').addEventListener('click', monStartScan);

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
      if (!document.getElementById('search-wrap').contains(e.target) && !_searchDropdown.contains(e.target)) {
        _closeDropdown();
      }
    });
  }

  function init() {
    P.setUiHooks({ showToast, switchTab });
    applyScale();
    bindEvents();
    P.updateBadge();
    P.relayout();
    monCheckStatus();
    initSearch();
  }

  global.UiController = {
    init,
    switchTab,
    showToast,
    monCheckStatus,
    monStartScan,
  };
})(window);
