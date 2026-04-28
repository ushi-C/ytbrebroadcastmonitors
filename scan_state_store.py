"""
scan_state_store.py
───────────────────
扫描状态存储（线程安全包装）。

设计目标：
- 保持现有 SCAN_STATE 字典结构不变
- 提供更清晰的状态更新入口，减少散落的字典直接写入
- 不改变线程/异步模型，不改变 API 返回结构
"""

from __future__ import annotations

from threading import RLock
from typing import Any


class ScanStateStore:
    """对扫描状态字典进行受控读写。"""

    def __init__(self) -> None:
        self._lock = RLock()
        self._state: dict[str, Any] = {
            "is_running": False,
            "progress": 0,
            "total": 0,
            "results": [],
        }

    @property
    def state(self) -> dict[str, Any]:
        """返回状态字典引用（保持与历史外部访问方式兼容）。"""
        return self._state

    def reset_for_new_scan(self) -> None:
        with self._lock:
            self._state.update(is_running=True, progress=0, total=0, results=[])

    def set_total(self, total: int) -> None:
        with self._lock:
            self._state["total"] = total

    def add_progress(self, count: int) -> None:
        with self._lock:
            self._state["progress"] += count

    def add_results(self, items: list[dict]) -> None:
        if not items:
            return
        with self._lock:
            self._state["results"].extend(items)

    def set_running(self, is_running: bool) -> None:
        with self._lock:
            self._state["is_running"] = is_running
