(function (global) {
  // 兼容动态模板中的内联 oninput="setVolume(...)"
  global.setVolume = function (id, val) {
    global.PlayerManager.setVolume(id, val);
  };

  global.UiController.init();
})(window);
