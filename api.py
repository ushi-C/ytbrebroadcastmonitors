"""
api.py
──────
FastAPI 路由层，不含任何业务逻辑。
所有实际工作都委托给 scanner / avatar_cache 模块。

挂载方式（在 main.py 中）：
    from api import build_app
    app = build_app(resource_dir, app_dir_fn)
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import avatar_cache as _ac
import scan_service as _svc


# ── Lifespan ──────────────────────────────────────────────────────────────────

def _make_lifespan(app_dir_fn):
    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        _ac.load_channel_avatar_cache()
        _ac.start_cleanup_loop()
        try:
            yield
        finally:
            _ac.save_channel_avatar_cache()
    return lifespan


# ── 工厂函数 ──────────────────────────────────────────────────────────────────

def build_app(resource_dir: str, app_dir_fn) -> FastAPI:
    """
    创建并返回配置好的 FastAPI 实例。

    Parameters
    ----------
    resource_dir : str  打包后的资源根目录（存放 index.html / style.css / app.js）
    app_dir_fn   : callable  返回运行时数据目录（exe 旁边）的函数
    """
    app = FastAPI(lifespan=_make_lifespan(app_dir_fn))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── 路由 ──────────────────────────────────────────────────────────────────

    class CheckRequest(BaseModel):
        query: str
        title: str = ""

    @app.post("/api/check")
    async def check_single(req: CheckRequest):
        """对单个频道做直播检测。"""
        q = (req.query or "").strip()
        if not q:
            raise HTTPException(status_code=400, detail="query is required")

        result = await _svc.check_single_channel(q, req.title)
        return {"result": result}

    @app.get("/api/channels")
    def get_channels():
        """把 channels.csv 以 JSON 返回，供前端模糊搜索使用。"""
        file_path = os.path.join(app_dir_fn(), "channels.csv")
        if not os.path.exists(file_path):
            return {"channels": []}
        return {"channels": _svc.load_channels_for_search(app_dir_fn)}

    @app.post("/api/refresh")
    async def trigger_refresh():
        """触发全量扫描，已在扫描中则返回 busy。"""
        return {"status": _svc.trigger_refresh_scan()}

    @app.get("/api/status")
    async def get_status():
        """返回当前扫描状态。"""
        return _svc.get_scan_status()

    @app.get("/api/avatar")
    def get_avatar(u: str):
        """图片代理：下载并缓存到本地磁盘，减少对 YouTube CDN 的重复请求。"""
        if not u or not u.startswith("http"):
            raise HTTPException(status_code=400, detail="invalid url")
        try:
            path = _ac.get_avatar_disk_path(u)
        except ValueError as exc:
            raise HTTPException(status_code=413, detail="image too large") from exc
        except Exception as exc:
            raise HTTPException(status_code=404, detail="fetch failed") from exc
        return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})

    # ── 静态文件（必须最后挂载，否则会覆盖 API 路由）────────────────────────
    if os.path.isfile(os.path.join(resource_dir, "index.html")):
        app.mount("/", StaticFiles(directory=resource_dir, html=True), name="static")

    return app
