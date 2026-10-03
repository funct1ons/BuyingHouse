# 原创美术 · 街区里的这一年

## 来源与范围

本套图形专为本项目原创绘制：以矩形、圆与自定义 SVG 路径组合商品、街区、住房和仓储。没有临摹游戏素材、下载图库、第三方图标、字体、远程图片或 CDN。画面中的植物、街灯、自行车、邻居、咖啡桌和暖色窗光共同表达「从经营小生意，到拥有自己的家」。无 emoji、无文字替代商品图案。

运行时使用 `js/art.js` 中内联图形，不读取文件、不依赖 fetch；`assets/svg/` 为同一生成结果的独立 SVG，可以直接用浏览器查看。所有 SVG 无 fragment ID、渐变、滤镜或外部引用，因此多次内联没有 ID 冲突。

## API 与接入

在 `js/data.js` **之后**、UI 脚本之前加载经典脚本 `js/art.js`。该脚本只添加 `window.HomeYear.Art`，不修改数据与游戏逻辑。

```js
HomeYear.Art.icon('rice');
HomeYear.Art.icon('cash', 'status-icon');
HomeYear.Art.scene('city');
HomeYear.Art.scene('house-2');
HomeYear.Art.scene('warehouse');
```

- `icon(id, className = '')` 返回完整内联 SVG 字符串，viewBox `0 0 64 64`。附加 class 经 XML 转义；默认类为 `art-icon`。
- 20 商品：rice / oil / pork / eggs / fruit / milk / phone / gpu / console / camera / gold / watch / collectible / coat / ac / umbrella / mask / medicine / battery / food。每款采用不同轮廓与物件细节，而非同形改字。
- 通用图标：cash / assets / warehouse / home / news / calendar / sound / settings / help / buy / sell / arrow / close / star / search。
- 兼容别名：room / small / normal / large → warehouse；music → sound；next → arrow；inventory → warehouse；chart / profit → assets；coin → cash。住房 ID 用于 `icon()` 时对应 home。
- `scene(kind)` 返回完整内联 SVG 字符串。city 为 `1000×620` 主视觉，带远景天际线、中景街区、前景道路、植物和生活人物。warehouse 和五级住房为 `480×300`。
- 房屋严格按当前数据顺序：house-0 老旧单间（低矮旧街屋）；house-1 普通公寓（窄侧楼体及阳台）；house-2 舒适两居（双坡顶独立住宅）；house-3 城市住宅（现代多层及双阳台）；house-4 理想之家（错层平顶花园住宅）。
- scene 支持 studio / flat / two / dream 别名；**city 始终为城市主视觉**，城市住宅请使用 house-3，避免与房屋数据 ID city 冲突。
- 未知 icon 回退 home，未知 scene 回退 city。
- `iconIds` / `sceneIds` 为冻结的支持列表；`palette` 提供色板。

图形默认 `aria-hidden="true"`、`focusable="false"`，作为旁边文字的装饰。独立承载信息时由 UI 容器提供可读标签。SVG 仅含 viewBox，UI 应设置宽高；推荐小图标 24–40px，并设置 `display:block`。插画可用 `width:100%;height:auto` 自适应，不需要额外字体。

## 调色板

| 用途 | 色值 |
|---|---|
| 深蓝绿轮廓 / ink | #234c50 |
| 米白纸面 / paper | #fbf4e6 |
| 纸影 / cream | #e9dcc4 |
| 暖橙 / orange | #ed9b53 |
| 珊瑚 / coral | #d97562 |
| 植物绿 / mint | #8db6a0 |
| 灰蓝 / blue | #83a6ae |
| 温暖窗光 / light | #ffe3a0 |

纸感来自柔和底色、低对比景深与扁平纸片状建筑，而非昂贵噪声滤镜。避免给整个主视觉加高饱和背景。

## 导出与验证

`node --check js/art.js`：语法通过。

`node assets/build-art.cjs`：无需安装包，以 Node 内置 fs/vm 加载 data 与 art，导出 35 图标 + 7 插画，并验证全部 20 商品图标唯一、6 张城市/住房图有效、仓储有效、class 转义、无外部图形依赖、无 fragment ID。此脚本仅开发时使用，游戏运行不需要 Node。

独立文件命名：`assets/svg/icon-rice.svg`、`assets/svg/city.svg`、`assets/svg/house-0.svg` … `house-4.svg`、`assets/svg/warehouse.svg`。
