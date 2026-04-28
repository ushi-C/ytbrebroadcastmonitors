"""
scan_service.py
───────────────
API 编排服务层：
- 保持现有业务行为不变
- 将路由层中的编排代码集中，提升模块边界清晰度
"""

from __future__ import annotations

import asyncio
import os

import scanner as _sc
from channel_csv_reader import read_channels_csv_rows


async def check_single_channel(query: str, title: str = "") -> dict | None:
    """执行单频道检测，返回扫描结果或 None。"""
    target_url, cid = _sc.normalize_channel_live_url(query)
    handle_mark = _sc.extract_handle_mark(target_url) or _sc.extract_handle_mark(query)
    name_raw = title or None

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        _sc.EXECUTOR, _sc.check_live_sync, target_url, cid, name_raw, handle_mark
    )


def load_channels_for_search(app_dir_fn) -> list[dict[str, str]]:
    """读取 channels.csv 并返回前端搜索所需格式。"""
    file_path = os.path.join(app_dir_fn(), "channels.csv")
    if not os.path.exists(file_path):
        return []

    return [
        {
            "id": (r.get("id") or "").strip(),
            "url": (r.get("url") or r.get("URL") or "").strip(),
            "title": (r.get("title") or r.get("name") or "").strip(),
        }
        for r in read_channels_csv_rows(file_path)
        if (r.get("id") or "").strip() or (r.get("url") or "").strip()
    ]


def trigger_refresh_scan() -> str:
    """触发全量扫描，返回状态 started/busy。"""
    state = _sc.SCAN_STATE
    if not state["is_running"]:
        _sc.SCAN_STATE_STORE.reset_for_new_scan()
        asyncio.create_task(_sc.start_scan_task())
        return "started"
    return "busy"


def get_scan_status() -> dict:
    """返回当前扫描状态（保持原有字典结构）。"""
    return _sc.SCAN_STATE
