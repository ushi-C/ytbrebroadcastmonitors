"""
channel_csv_reader.py
─────────────────────
统一 channels.csv 读取策略：
- 按既定编码顺序尝试读取
- 将字段名标准化为小写并去除空白
- 读取失败时返回空列表

注意：该模块只负责“读取与标准化列名”，
不负责业务字段映射与过滤，以保持调用方原有行为不变。
"""

from __future__ import annotations

import csv
from typing import Iterable

# 保持与历史实现一致的编码回退顺序（行为兼容关键）
CHANNELS_CSV_ENCODINGS: tuple[str, ...] = (
    "utf-8-sig",
    "gbk",
    "cp936",
    "cp932",
    "shift_jis",
    "utf-8",
    "latin1",
)


def read_channels_csv_rows(file_path: str, encodings: Iterable[str] = CHANNELS_CSV_ENCODINGS) -> list[dict]:
    """读取 channels.csv 并返回原始行列表（dict）。

    - 成功：返回 list[dict]
    - 全部编码失败：返回 []

    该函数不抛出读取异常，保持与既有调用方逻辑一致。
    """
    for encoding in encodings:
        try:
            with open(file_path, mode="r", encoding=encoding) as f:
                reader = csv.DictReader(f)
                reader.fieldnames = [fn.lower().strip() for fn in (reader.fieldnames or [])]
                return list(reader)
        except Exception:
            continue
    return []
