# YT Rebroadcast Monitor (YTBmonitor)

一个本地运行的 YouTube 直播监控工具：读取同目录 `channels.csv`，获取各频道 `/live` 是否在播，在内置桌面窗口中展示结果。

- 后端：FastAPI + Uvicorn（本机 `127.0.0.1:8000`）
- 桌面壳：pywebview（Windows 下默认 Edge WebView2）
- 前端：`index.html`（由后端静态托管）
- 检查：`yt-dlp` 获取 `is_live`、标题等信息

## 发布形态

已支持以下发布形态：

- `exe` 图形化启动
- 默认安装到 `C:\Program Files\YTBmonitor`
- 开始菜单/桌面快捷方式
- 一键卸载（系统“应用和功能”中可卸载）

## 开发运行

```powershell
python -m pip install -r requirements.txt
python main.py --mode browser
```

说明：

- `--mode browser`：开发调试用，自动打开系统浏览器
- 默认模式是 `--mode gui`：内置桌面窗口

## 架构分层说明（Presentation / Application / Domain / Infra）

当前项目按照“保守分层 + 门面封装”的方式组织：

### 1) Presentation（表现层）

负责 HTTP 路由、页面渲染入口、DOM 交互与用户事件，不承载业务细节。

- 后端路由：`api.py`
- 前端页面与样式：`index.html`、`style.css`
- 前端运行入口与 UI 编排：`main.js`、`ui-controller.js`

### 2) Application（应用编排层）

负责“流程编排”：把路由请求转为业务调用，协调状态与外部调用顺序。

- `scan_service.py`：扫描相关应用服务（check/refresh/status/channels）
- `api-client.js`：前端 API 访问与轮询管理
- `player-manager.js`：播放器窗口生命周期与布局编排

### 3) Domain（领域规则层）

负责稳定的业务规则和状态语义（不直接依赖 UI）。

- `scanner.py`：直播检测规则、批量扫描流程、URL 规范化
- `scan_state_store.py`：扫描状态结构与受控更新语义
- `dom-utils.js`：前端纯规则函数（标题解析、视频 ID 解析、转义）
- `state-store.js`：前端运行时状态模型

### 4) Infra（基础设施层）

负责文件系统、缓存、网络请求、打包等外部依赖细节。

- `avatar_cache.py` + `avatar_cache_components.py`：头像缓存门面 + 磁盘/内存实现
- `channel_csv_reader.py`：`channels.csv` 编码回退读取
- `config_manager.py`：窗口配置持久化
- `build.bat` / `build_installer.bat` / `installer.iss`：打包与安装器构建

---

## 开发指南（新增 API / 新增 UI 功能）

### A. 如果要新增一个 API

建议按顺序修改：

1. **Presentation**：在 `api.py` 新增路由、参数校验、HTTP 异常映射。
2. **Application**：在 `scan_service.py`（或新 service 文件）新增编排函数。
3. **Domain/Infra**：
   - 纯业务规则放到 `scanner.py` / `scan_state_store.py`
   - 文件/网络/缓存交互放到 `channel_csv_reader.py` / `avatar_cache*.py` 等基础设施模块
4. **测试**：在 `tests/` 增加与新增模块对应的单元测试。

> 原则：路由层只做输入输出，业务流程在 service 层，外部依赖放 infra。

### B. 如果要新增一个 UI 功能

建议按顺序修改：

1. **状态定义**：先在 `state-store.js` 增加状态字段（默认值明确）。
2. **纯工具逻辑**：可复用规则放到 `dom-utils.js`。
3. **业务交互**：
   - 与播放窗口生命周期相关：改 `player-manager.js`
   - 与 DOM 绑定、Tab、搜索、监测交互相关：改 `ui-controller.js`
4. **后端请求**：统一走 `api-client.js`，不要在 UI 文件里直接 `fetch`。
5. **启动顺序**：如需初始化动作，保持在 `main.js` 统一入口编排，避免分散自启动代码。

> 原则：避免重新引入“单文件巨石”；新增逻辑先定状态边界，再落地事件绑定。

---

## 测试与验证（新架构）

运行以下命令验证测试：

```powershell
python -m unittest discover -s tests -p "test_*.py"
```

当前测试覆盖：

- `tests/test_channel_csv_reader.py`
- `tests/test_scan_state_store.py`
- `tests/test_avatar_cache_components.py`

建议在提交前再执行一次语法检查：

```powershell
python -m py_compile main.py api.py scanner.py avatar_cache.py avatar_cache_components.py config_manager.py channel_csv_reader.py scan_service.py scan_state_store.py
```

## 打包方式

```powershell
.\build.bat
```

> 打包会自动使用项目根目录的 `icon.ico` 作为 EXE 图标（同时用于窗口左上角图标）。

成功后生成：

- `dist\YTBmonitor.exe`

## 打包安装程序（Setup + Uninstall）

前置要求：安装 Inno Setup 6。

> `build_installer.bat` 会优先从 PATH 查找 `ISCC.exe`，并自动尝试常见安装目录（如 `C:\Program Files (x86)\Inno Setup 6`）。

```powershell
.\build_installer.bat
```

成功后生成：

- `dist\YTBmonitor-Setup.exe`

安装程序会：

- 安装到 `YTBmonitor` 目录
- 创建开始菜单快捷方式（可选桌面快捷方式）
- 写入卸载入口（支持一键卸载）

## `channels.csv` 格式

程序会在 **运行目录** 查找 `channels.csv`（安装版请放到 `YTBmonitor.exe` 同目录）。

支持字段：

- `id`：频道 ID（`UC...`）
- `url`：可选，频道 URL / handle
- `title` 或 `name`：可选，显示名

示例：

```csv
id,url,title
UCxxxxxxxxxxxxxxxxxxxxxx,https://www.youtube.com/UCxxxxxxxxxxxxxxxxxxxxxx,Some Channel
UCyyyyyyyyyyyyyyyyyyyyyy,,另一个频道
```

该文件一般需要用户从自己的 YouTube 数据导出。并统一导出的关注列表（csv 文件）的表格第一行列名分别为 `id,url,title`。
