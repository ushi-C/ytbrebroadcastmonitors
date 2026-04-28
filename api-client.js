(function (global) {
  async function refreshScan() {
    return fetch('/api/refresh', { method: 'POST' });
  }

  async function getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  }

  async function checkChannel(query, title) {
    const resp = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, title: title || '' }),
    });
    return resp.json();
  }

  async function getChannels() {
    const res = await fetch('/api/channels');
    return res.json();
  }

  function createStatusPoller(onTick) {
    let timer = null;

    function start() {
      if (!timer) timer = setInterval(onTick, 2000);
      return timer;
    }

    function stop() {
      clearInterval(timer);
      timer = null;
      return timer;
    }

    function getTimer() {
      return timer;
    }

    return { start, stop, getTimer };
  }

  global.ApiClient = {
    refreshScan,
    getStatus,
    checkChannel,
    getChannels,
    createStatusPoller,
  };
})(window);
