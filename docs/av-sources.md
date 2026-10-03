# 视听升级 · 参考与来源记录

记录日期：2026-10-03。抓取方式：本机 `curl` / Node `https` 直接请求页面并提取正文片段，另用 Bing 检索（多词英文查询被本地化结果干扰，收效差，见末尾“失败记录”）。**下表“已核实”仅指本次实际取回页面并读到对应文字，不是法律意见。**

## 一、结论先行

- **本轮不引入任何外部美术或音频素材。** 画面、图标、配乐、音效、混响脉冲响应均原创/程序生成，随项目本地分发，不依赖 CDN。
- 下列商业游戏只作“气质/情绪”的口头参照，**不临摹构图、不取色、不截图入库、不使用其任何素材或音乐**。
- 技术参考（MDN、W3C 规范、MIT 示例）用于实现方法，代码原创编写，不复制示例源码。
- 如将来确需外部素材：只接受页面上明确写明 CC0 或可再分发许可证、且能追溯原作者的条目；下载到 `assets/third-party/<名称>/`，同目录保存许可证原文与来源 URL，并在本文件登记。**未逐项核实的条目一律不得标为 CC0。**

## 二、技术参考（已核实取回）

| 主题 | URL | 作者/发布方 | 授权/性质 | 本项目用法 |
|---|---|---|---|---|
| Web Audio 自动播放与用户手势 | https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay | MDN 贡献者 | 文档，CC-BY-SA 2.5（MDN 文本） | 首次交互后创建/resume AudioContext 的依据 |
| Web Audio 最佳实践（含 Autoplay policy 节） | https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices | MDN 贡献者 | 同上 | 上下文生命周期、suspended 状态处理 |
| `AudioParam.setTargetAtTime()` | https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime | MDN 贡献者 | 同上 | 平滑增益/滤波过渡，避免爆音 |
| `OfflineAudioContext` | https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext | MDN 贡献者 | 同上 | 开发期离线渲染试听样本与电平测量 |
| `ConvolverNode` | https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode | MDN 贡献者 | 同上 | 程序生成脉冲响应的房间混响 |
| `DynamicsCompressorNode` | https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode | MDN 贡献者 | 同上 | 音乐总线限峰 |
| `BiquadFilterNode` | https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode | MDN 贡献者 | 同上 | 音色塑形、对话框“闷化”混音快照 |
| `AnalyserNode` | https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode | MDN 贡献者 | 同上 | 峰值/RMS 自动测量（沿用现有诊断思路） |
| Page Visibility API | https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API | MDN 贡献者 | 同上 | 隐藏标签页淡出暂停、返回恢复 |
| `createDynamicsCompressor()` | https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createDynamicsCompressor | MDN 贡献者 | 同上 | 同上 |
| Web Audio API 1.1 规范 | https://webaudio.github.io/web-audio-api/ | W3C Audio WG | W3C 规范 | 时序与节点语义的权威依据 |
| 前瞻调度示例 Web Audio Metronome | https://github.com/cwilso/metronome | Chris Wilson | 仓库标注 MIT license（README 显示 “MIT license”，含 LICENSE.txt） | “setTimeout 唤醒 + AudioContext 时钟精确排程”模式；**只借鉴方法，不复制代码** |
| JavaScript Systems Music | https://teropa.info/blog/2016/07/28/javascript-systems-music.html | Tero Parviainen，2016-07-28 | 博客文章（版权归作者） | 用 Web Audio 重建 Reich/Eno 系统音乐的思路：长周期、不等长循环避免听感重复 |
| `feTurbulence` | https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence | MDN 贡献者 | 文档 | 原创纸纹/墙面颗粒材质，仅生成静态平铺纹理 |
| `mix-blend-mode` | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mix-blend-mode | MDN 贡献者 | 文档 | 光影叠加层（multiply/screen） |
| `prefers-reduced-motion` | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion | MDN 贡献者 | 文档 | 减少动效 |
| ITU-R BS.1770 | https://www.itu.int/rec/R-REC-BS.1770 | ITU-R | 标准索引页（已取回标题） | 只作“响度/真峰值”概念参照；**本项目测试测的是窗口 RMS 与采样峰值，不是 LUFS 或 true-peak，不得混称** |

## 三、素材库调查（已核实许可声明，但本轮不采用）

| 来源 | URL | 已读到的授权文字 | 结论 |
|---|---|---|---|
| Kenney 支持页 | https://kenney.nl/support | “all game assets on the asset pages are public domain licensed (CC0) … Attribution is not required” | 许可清晰 |
| Kenney City Kit (Commercial) | https://kenney.nl/assets/city-kit-commercial | 页面 “License: Creative Commons CC0”，3D 城市模型 | 3D 低多边形风格与本项目手绘纸感插画不符，**不采用** |
| OpenGameArt FAQ | https://opengameart.org/content/faq | 说明 CC0 可无署名使用；站点会尽量核实 PD 内容，但许可以每个条目为准 | 站点混合多种许可，**不能整体视为 CC0** |
| OpenGameArt “CC0 Music” 合集 | https://opengameart.org/content/cc0-music-0 | 合集作者 midcyber（2017-02-28），列出若干芯片音乐/动作曲目 | 合集标签≠逐曲核实；曲风（chiptune/战斗）不符，**不采用** |
| Freesound FAQ | https://freesound.org/help/faq/ | 区分 CC0 与 Attribution 等许可，逐个声音不同 | 若将来采样，必须逐条记录许可与作者；本轮不采用 |
| Tone.js | https://tonejs.github.io/ ；许可 https://github.com/Tonejs/Tone.js/blob/main/LICENSE.md | MIT（版权人 Yotam Mann） | 许可允许，但属较大第三方运行时，与 prompt“禁止大型第三方运行时、轻依赖”冲突，**不引入** |
| FreePD | https://freepd.com/ | 页面标题 “FreePD.com - Site Closed” | 站点已关闭，不使用 |

## 四、气质参照（商业作品，仅文字描述，不取素材）

| 作品 | 官方页面（已取回标题） | 参照点 |
|---|---|---|
| Unpacking（Witch Beam） | https://www.unpackinggame.com/ | “用物件讲生活史”的环境叙事：通过房间里逐步增加的物件表达人生阶段 → 本项目住房插画中加入“随档次增加的生活物件” |
| A Short Hike（adamgryu） | https://ashorthike.com/ | 温暖、低压力、柔和的情绪基调 |
| Townscaper（Oskar Stålberg） | https://www.townscapergame.com/ | 街区建筑的块面组合与色彩节奏 |

说明：以上只确认了官方页存在，未对其美术做截图分析，也未引用其任何图片；文档中的视觉决策均为本项目原创表述。

## 五、抓取失败记录（如实，不再追查）

| 目标 | 结果 |
|---|---|
| web.dev / html5rocks “A Tale of Two Clocks”（音频调度原文） | 连接失败 / Cloudflare 质询，未取回；以 cwilso/metronome 仓库替代 |
| en/zh.wikipedia “Adaptive music” | 连接失败 |
| gamedeveloper.com 自适应音乐文章 | 403 Cloudflare |
| Audiokinetic Wwise 互动音乐文档 | 跳转到 captcha |
| FMOD Studio 文档 | 仅取回 453 字节空壳页 |
| EBU R128 | 403 |
| Pixabay 许可摘要 | 403 |
| incompetech FAQ | 404 |
| Steam Townscaper 页面 | 连接失败 |
| Bing 英文多词检索 | 结果被中文词典/无关页面污染，未作为来源 |

“横向重排（horizontal re-sequencing）/ 纵向分层（vertical layering）”是游戏音频行业通用术语；因上述权威页面未能取回，本文档**不为其附具体出处**，仅作为通用设计词汇使用。
