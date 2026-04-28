(function (global) {
  global.AppState = {
    // scale / toast
    stTimer: null,
    toastTimer: null,

    // player layout
    MAX_PLAYERS: 6,
    cardCount: 0,
    layoutCols: 1,
    layout: [],
    GAP: 6,
    PAD: 8,
    ratioMode: {},

    // monitor polling/render
    monPolling: null,
    scanRenderedKeys: new Set(),
    searchRenderedKeys: new Set(),

    // search
    csvChannels: [],
    fuse: null,
    checkCache: new Map(),
    checking: new Set(),
    searchTimer: null,
  };
})(window);
