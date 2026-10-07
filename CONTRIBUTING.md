# 参与贡献

欢迎参与《这一年，安个家》！报告问题、提出玩法建议、改进文档、提交代码和协助试玩都很有帮助。

## 从哪里开始

- 报告异常：在 [Issues](https://github.com/funct1ons/BuyingHouse/issues) 中搜索后，选择“问题反馈”模板，填写复现步骤和运行环境。
- 提出功能或玩法建议：选择“功能与玩法建议”模板，先描述场景、问题和期望效果。
- 改进说明：选择“文档改进”模板；小型文档修正和明确的小问题修复也可以直接提交 PR。
- 认领已有问题：先查看 Issue 下的讨论，留言说明准备处理的范围，避免重复投入。较大功能、架构调整、规则或存档格式变更，请先与维护者确认方向。

不知道如何分类时，也可以创建空白 Issue。提交建议不要求同时提供实现。

## 本地运行

这是一个原生 HTML、CSS、JavaScript 静态游戏，无需安装 npm 依赖或执行构建。

1. 在 GitHub 上 Fork 本仓库。
2. 克隆自己的 Fork，把下面的 `YOUR_USERNAME` 替换成你的账号：

   ```bash
   git clone https://github.com/YOUR_USERNAME/BuyingHouse.git
   cd BuyingHouse
   git remote add upstream https://github.com/funct1ons/BuyingHouse.git
   git switch -c fix/short-description
   ```

3. 使用 Chrome 或 Edge 打开根目录的 `index.html`。
4. 修改代码后刷新页面验证。涉及存档的实验，建议先导出备份或使用独立浏览器配置。

游戏本身无需 Node.js；执行命令行测试时建议使用 Node.js 24，浏览器自动验收工具要求 Node.js 24 和本机 Edge。

## 代码与文档入口

| 路径 | 内容 |
| --- | --- |
| `index.html`、`css/`、`js/ui.js` | 页面、样式与交互 |
| `js/data.js`、`js/market.js`、`js/trading.js`、`js/game.js` | 游戏数据、市场、交易与流程 |
| `js/street.js` | 信用社与刮刮乐相关逻辑 |
| `js/save.js`、`js/validation.js` | 存档与校验 |
| `js/audio*.js`、`js/art*.js`、`assets/` | 音乐、绘图与素材 |
| `tests/` | 核心测试和浏览器验收脚本 |
| `docs/gameplay-rules-0.13.md` | 当前玩法规则说明 |

沿用修改文件现有的代码风格，避免无关的整文件格式化。引入运行依赖或改变离线运行方式前，请先讨论必要性。

## 按改动范围验证

在仓库根目录执行命令，并在 PR 中记录实际结果。仓库当前没有统一的 npm 测试命令。

| 改动范围 | 建议验证 |
| --- | --- |
| 纯文档、Issue／PR 模板 | 检查内容、相对链接和格式，无需运行游戏测试 |
| JavaScript 游戏逻辑 | 执行 `node tests/run.cjs`，并验证受影响的具体玩法 |
| 信用社、刮刮乐逻辑 | 在核心测试之外执行 `node tests/loan-lottery.cjs` |
| 界面、样式、交互 | 在浏览器中操作受影响流程，提供截图、窗口大小和缩放比例；涉及移动端时验证手机尺寸和触摸交互 |
| 存档或规则 | 验证新局、保存／读取、导入／导出和不兼容或损坏存档的处理，说明兼容性影响 |

也可以在浏览器中打开 `tests/browser.html` 查看核心测试结果。浏览器自动冒烟检查可运行 `node tests/cdp-smoke.cjs`，环境和参数见 [浏览器工具说明](docs/browser-tooling.md)；该文档末尾的历史执行记录不代表当前版本结果。

修复逻辑缺陷时，尽量增加能够复现问题的回归用例。涉及随机行为时记录种子、难度和操作顺序。无法执行的检查或已有失败，请在 PR 中如实说明，不要将其标记为通过。截图和报告只保留与本次改动有关的必要材料，避免批量提交本地生成目录。

## 提交与审查 PR

1. 将改动提交并推送到自己的功能分支：

   ```bash
   git add <本次修改的文件>
   git commit -m "Fix short description"
   git push -u origin fix/short-description
   ```

2. 向 `funct1ons/BuyingHouse` 的 `main` 分支发起 PR，填写自动出现的模板。尚未完成、希望提前讨论的改动可以先开 Draft PR。
3. 写清解决的问题、修改前后行为和验证结果。完全解决某个 Issue 时使用 `Closes #编号`，仅有关联时使用 `Refs #编号`。
4. 收到审查意见后，在同一分支继续提交并推送，PR 会自动更新。
5. 维护者确认方向、代码和验证结果后决定是否合并；需要调整或暂不接受时，会在讨论中说明原因。合并后可删除自己的功能分支。

一个 PR 尽量只解决一个问题。维护者重点检查玩法一致性、可复现性、浏览器体验和存档影响；贡献者负责说明改动并完成适用验证。

## 维护者处理清单

- 收到 Issue：检查是否重复、信息是否足够；需要复现材料时指出具体缺少什么。
- 接受建议：说明范围和可验证的完成条件；适合新人且描述明确的任务可标为 `good first issue`（需在仓库中创建或已有该标签）。
- 审查 PR：核对关联问题、实际差异和验证结果，必要时本地复现，提出具体可执行的意见。
- 合并前：确认未解决的问题和兼容性影响。当前 Pages 工作流会在推送到 `main` 后部署站点，合并涉及游戏文件的 PR 会触发部署。
- 合并后：检查部署结果，按需关闭关联 Issue 和更新版本说明。

当前 GitHub Actions 配置用于 Pages 部署，并未自动运行 PR 测试；请以贡献者记录的验证结果和维护者复核为依据。
