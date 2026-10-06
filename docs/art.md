# 原创美术 · 街区里的这一年（视听升级版）

## 来源与范围

本套图形是本项目原创，用矩形、圆、椭圆和自定义 SVG 路径在 `js/art-kit.js`、`js/art-scenes.js`、`js/art.js` 中程序化绘制。没有临摹任何游戏素材，没有下载图库、第三方图标、字体、远程图片，也不依赖 CDN（来源核查见 `docs/av-sources.md`）。

方向（见 `docs/av-direction.md` 第 2 节）：温暖都市、成熟纸本插画。统一左上暖光，立面分受光/本色/背光三调，阴影偏冷、高光偏暖；画面有远景天际线（降饱和、加雾）、中景街区和前景剪影。

## 文件与加载顺序

经典 defer 脚本，顺序为 `data.js → … → save.js → art-kit.js → art-scenes.js → art.js → audio.js → ui.js`；样式依次为 `css/main.css`、`css/scenes.css`。不用 fetch，也不用 ES 模块。

| 文件 | 内容 |
|---|---|
| `js/art-kit.js` | 6 个时段色板（dusk/morning/day/evening/golden/bluehour）、阶段→时段映射、四季叶色、三调材质 `mat()`、表现层 PRNG（mulberry32，与游戏 RNG 无关）、共享 defs、纸纹贴图、SVG 包装与独立导出 |
| `js/art-scenes.js` | 9 个场景构图及建筑/窗/树/人物等图元，带场景字符串缓存 |
| `js/art.js` | 20 个重绘商品图标 + 通用 UI 图标 + 徽记 `seal`，汇总公开 API |

## 共享 defs 与 ID 规则

- 渐变、图案（`hy-brick`、`hy-tile`、`hy-roof`、`hy-wood`、`hy-shutter`、`hy-grille`、`hy-corr`、`hy-ripple`、`hy-dapple` 等），以及各时段的 `hy-sky-*`、`hy-glass-*`、`hy-glow`、`hy-lamp`、`hy-vignette` 等，全部只在 `HomeYear.Art.mount()` 插入的一个隐藏 `<svg id="hy-defs">` 中定义一次。该 svg 用绝对定位、宽高 0 隐藏，不用 `display:none`，因为 Chromium 不渲染 display:none 里的渐变。
- 场景与图标内部**不带任何 id**，只引用 `url(#hy-…)`。同一场景内联多次也不会有 ID 冲突。
- 导出的独立 SVG 由 `HomeYear.Art.standalone()` 把 defs 嵌入文件开头，可以直接用浏览器打开。
- `assets/build-art.cjs` 检查：场景与图标无 `id=`、无外部 URL、无 `href`；每个 `url(#…)` 都以 `hy-` 开头并且确实已定义；20 个商品图标互不相同；6 个住房/租房场景互不相同；同一场景四季版本互不相同；别名与回退保持不变。

## API（向后兼容）

```js
HomeYear.Art.icon('rice');                       // 64×64，旧签名不变
HomeYear.Art.scene('house-2');                   // 无参数时为默认时段，旧调用照常可用
HomeYear.Art.scene('house-2', {phase:'sprint', season:'autumn'});
HomeYear.Art.scene('city', {lamps:true});        // 开始页：≤12 扇窗带错时点亮动画
HomeYear.Art.mount(document);                    // 插入共享 defs + 生成纸纹（UI 启动时调用一次）
```

- `scene(kind, opts)` 的 `opts` 可选：`phase` 为 menu/early/development/sprint/ending-home/ending-rent，经 `phaseTone` 映射到时段；`tone` 可直接指定时段；`season` 为 winter/spring/summer/autumn；`lamps` 为 true 时开启亮灯动画分组。
- 新增 `sceneIds`：`city`、`street`（市场顶栏街景横幅，2400×120，`xMidYMax slice`）、`rent`（新增租房场景）、`house-0`…`house-4`、`warehouse`。
- 别名不变：studio/flat/two/dream → house-n；`city` 始终是城市主视觉；未知场景回退 city，未知图标回退 home。
- 新增只读：`productIconIds`、`tones`、`seasons`、`phaseTone`、`defs()`、`standalone()`。

## 场景构图

| 场景 | 外观 | 窗内“生活物件” |
|---|---|---|
| `city` 开始页 | 黄昏全幅街区：砖砌老楼（防盗窗、外机、晾衣）、白瓷砖楼与早餐铺、便利店灯箱（无品牌文字）、板楼、单元门与楼道灯、快递柜、公告栏、梧桐、电动车、行人剪影、猫；远/中/近三层视差 | 多扇窗内有台灯、窗帘、书架 |
| `street` 市场顶栏 | 横向连续街区，商铺、卷帘、晾衣、外机、路灯、行人、早餐摊 | — |
| `rent`（新增） | 老楼顶层砖墙、大防盗窗、外挂空调、晾衣绳、水箱、屋顶猫 | 折叠床、纸箱当桌、台灯 |
| `house-0` 老旧单间·旧街 | 坡顶砖屋，新刷绿色房门、门牌、门口花盆；左右为卷帘铺与小卖部 | 小书架、第一张挂画、绿植、台灯 |
| `house-1` 普通公寓·近郊 | 电梯板楼（红色电梯井）、封闭阳台、晾衣、车棚 | 被金框标出的阳台：小桌、自行车、绿植 |
| `house-2` 舒适两居·河岸 | 河岸多层、整面落地窗、远桥、水面倒影、栏杆、小船 | 沙发、落地灯、猫、挂画 |
| `house-3` 城市住宅·中心 | 玻璃幕墙反射当前时段的天空渐变，入夜时顶部灯带亮起 | 开放厨房吊灯、绿植墙 |
| `house-4` 理想之家·花园 | 双层坡顶花园住宅、木门、院墙、石径、院灯、树下秋千 | 书房（书墙、书桌、台灯）、长餐桌 |
| `warehouse` | 波纹板仓库、三道卷帘门（中间一道打开见货架）、手推车、三轮车 | 货架纸箱 |

季节只替换附件层：冬天屋顶和地面有积雪、枯枝、飘雪、行人系围巾；春天有花瓣和樱花点缀；夏天浓荫梧桐、竹帘；秋天银杏黄叶、地面落叶。建筑本身不重画。

## 商品图标

20 个商品全部重新绘制，不是在旧图上加阴影：统一用暖墨细线（1.5px，64 坐标系下）、三调填色、左上白色高光、右侧背光和底部投影。示例：大米是束口米袋加红色稻穗标签和散落米粒；猪肉是砧板上的带皮五花；鸡蛋装在草编篮里；水果为苹果加橙子；牛奶为纸盒加玻璃杯；显卡有双风扇和金手指；相机带皮纹；黄金饰品装在丝绒盒里；城市藏品为青花瓶；羽绒服有绗缝；空调带冷风和遥控器；常备药为药盒加泡罩板；应急食品为罐头加水瓶。通用 UI 图标保持原有轮廓，只换成新色板。

## 性能约定

- `scene()` 按 `kind|phase|tone|season|lamps` 缓存字符串（上限 80 条）。
- UI 用“场景槽”保存已解析的 DOM 节点：`renderGame` 每次重建 HTML 后，把原节点移回新的槽里，key 不变就不重新解析 SVG（`HomeYear.UI.sceneBuilds()` 可查看构建次数）。
- 亮灯动画只改 opacity；视差只在 pointermove 时用 rAF 平移三层 `<g>`，最大 8 CSS px，减少动效时关闭；没有常驻循环。
- 不在大面积或动画元素上用实时 SVG 滤镜；纸纹是启动时用 canvas 生成一次的 256×256 透明噪声 PNG，作为 CSS 背景层。

## 导出与验证

`node assets/build-art.cjs` 导出 `assets/svg/`：

- 基础文件：图标 `icon-*.svg`，场景 `city.svg`、`street.svg`、`rent.svg`、`house-0..4.svg`、`warehouse.svg`；
- 季节/阶段变体：如 `rent-winter.svg`、`house-4-ending-home.svg`、`street-sprint.svg`；
- `defs.svg`：共享 defs 本身。

所有导出文件都嵌入了 defs，可以单独打开。开发期画廊为 `tests/av-visual-gallery.html`，截图脚本为 `tests/av-visual-gallery.cjs`（tests/ 不随 Pages 发布）。

## 未完成与已知局限

- 人物只是剪影比例，不画面部（有意为之）；梧桐用圆簇概括，没有逐叶绘制。
- 早餐铺蒸汽、窗外飘雪等都是静态的，没有做循环动画（为了空闲 CPU 预算）。
- 季节附件只在市场页、住房传单、结算和庆祝中按公开 `season` 显示；开始页没有公开季节，固定为无季节的黄昏。
- 视觉质量的判断来自自动截图和开发者自查，**没有做过人工用户测试**。

## 0.11 街口

三张新场景、六枚彩票图标。用现有 art-kit。场景内无 id，只引用 `hy-` defs。图标同样只引用这些 defs。

| id | 画面 |
|---|---|
| `credit` | 信用社柜台 |
| `scratch-stand` | 纸摊横幅 |
| `housing-closed` | 售楼处关门。纸条文字不画进 SVG |

| id | 图案 |
|---|---|
| `lot-empty` | 空信封 |
| `lot-egg` | 鸡蛋 |
| `lot-red` | 红包 |
| `lot-umbrella` | 雨伞 |
| `lot-watch` | 金表 |
| `lot-key` | 房门钥匙 |
