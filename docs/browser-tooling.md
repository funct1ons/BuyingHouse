# Edge CDP 开发验收工具（阶段 1）

仅开发工具，无第三方包或应用运行依赖。需要 Node 24（内置 WebSocket）与本机 Edge。

```powershell
node tests/cdp-smoke.cjs
node tests/cdp-smoke.cjs --root "C:\files\code\BuyingHouse" --output "docs\browser-evidence-custom" --width 1280 --height 800 --settle 1200
```

可选：`--edge <exe>`（或 `EDGE_PATH` 环境变量）、`--temp-root <dir>`、`--startup-timeout <毫秒>`。含空格路径需引号。输出路径相对当前命令目录；默认输出使用项目 docs 下 UTC 时间戳目录。不要与其它运行共用同一输出目录。参数均为 `--名称 值`。

## 设施与边界

- `tests/cdp-helper.cjs` 导出 `launchEdge`、`CDP`、`getJSON`、`delay`。`launchEdge()` 返回 `cdp`、版本/PID/端口/profile 元数据及异步 `cleanup()`；调用者必须在 finally 清理。
- 专用随机临时用户目录、无头 Edge、`127.0.0.1` 与随机调试端口，不连接用户已有浏览器。不安装包、不修改用户配置。优先对自建浏览器发送 `Browser.close`，必要时仅终止自己 spawn 的进程；不按进程名批量结束。正常结束及脚本捕获异常后重试清理 profile。强制杀死 Node/机器断电无法保证 finally 执行。
- 直接 `file://` 打开 index；存在时运行 tests/browser.html，不硬编码核心脚本清单。检查 `window.HomeYear` 的存在、类型和 API 键；动态收集页面引用的本地 JS/CSS 路径、SHA256、mtime。工作树可被并发修改，hash 是观测时磁盘版本，不代表冻结构建或 git 提交。
- 记录页面 Runtime 异常、console、Log、网络失败及 HTTP(S)/WS(S) 外连尝试。外连不会被拦截；记录覆盖 CDP 页面目标，不是全浏览器后台联网审计。
- 每页一张当前 viewport PNG；记录页面尺寸、横/纵溢出和横向越界元素。横向溢出判失败；纵向滚动仅记录，不能自动当缺陷。截图存在不代表人工视觉验收完成。
- `report.json` 包含实际命令、UTC 时间、版本、API、测试结果和清理结果。退出码 1 表示本次观测失败；0 仅 smoke 观测通过，绝非最终 Gate。
- 本轮不点击操作、不测存档或完整局、不验证正式布局/多分辨率；后续正式 UI 完成再执行完整验收。

## 本次真实执行

命令：`node tests/cdp-smoke.cjs`，Node `v24.14.1`，Edge `154.0.4258.53`。

最后一次：2026-10-03T11:01:39.856Z 至 11:01:43.444Z；viewport 1280×800。

证据：`docs/browser-evidence-2026-10-03T11-01-39-854Z/`（report.json、index-html.png、tests-browser-html.png）。首次观测保留于 `docs/browser-evidence-2026-10-03T11-01-03-735Z/`。

index SHA256：`c9268fb47820d8d9384a4b16bebd6c53031ff5fcd151a06af4a86f1460444142`；没有可用 git 仓库，实际引用脚本的版本见最后 report 中 loadedFiles。

结果：**失败，不是最终 Gate**。

- Edge 真实启动，两页加载与截图成功；自建浏览器关闭、临时 profile 删除成功。
- HomeYear 对象存在；index 抛 `Uncaught Error: 存档版本不兼容`，堆栈 H.validate → H.create → H.Engine → ui.js（详情见 JSON）。
- browser core suite：0 passed / 8 failed，均为“存档版本不兼容”。未修改核心代码。
- 两页没有观察到页面外连、横向或纵向溢出。并不证明初始化正常，也不证明最终 UI 正确。
- `node --check tests/cdp-helper.cjs` 与 `node --check tests/cdp-smoke.cjs` 通过。

PowerShell 5.1 手动读取 JSON 请用 `Get-Content -Encoding UTF8`，否则中文可能被错误解码；工具写出的 JSON 本身为 UTF-8。也可用 Node `require()` 读取。
