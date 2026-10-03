# 音频只读诊断

执行：`node tests/audio-diagnostic.cjs`；完整数据：`audio-diagnostic-report.json`。

真实 Microsoft Edge 140.0.3485.54、headless、file://、独立临时浏览器配置，未修改产品文件或用户浏览器设置。音乐复选框使用 CDP Input.dispatchMouseEvent 实际可信鼠标点击，非 element.click()。页面脚本运行前包装 AudioNode.connect：保留原连接，仅对 master gain → destination 增加未连接到扬声器的 AnalyserNode 分支。每场景采样150次、每次2048样本、间隔约10ms；RMS为这些窗口的汇总而非整段连续录音。采样观察有重叠，窗口位置使RMS略变。只能证明浏览器数字音频，不证明用户扬声器实际发声。

|场景|AudioContext / timer|峰值|RMS|
|---|---|---:|---:|
|首次打开默认|uncreated / off|0|0|
|实际点击开启音乐（音效默认开）|running / on|0.008995|0.001798|
|音乐音效均关闭|suspended / off|0|0|
|从均关闭点击开启音乐|suspended / on|0|0|
|再点设置中的音量百分比文本|running / on|0.008950|0.001890|
|真实另一标签页激活，document.hidden=true|running / off|0|0|
|返回原标签页|running / on|0.008961|0.001741|
|DOM input 音量0（等150ms清除分析器旧缓存）|running / on|0|0|
|DOM input 恢复50%|running / on|0.008995|0.002092|
|保存后离开并重开同file URL，首次交互前|uncreated / off|0|0|
|点击继续（首次可信交互）|running / on|0.008995|0.001817|

音量用原DOM input事件路径，不将该两个合成input称作可信鼠标交互；保存重开是同一浏览器进程内真实导航重开，不声称进程重启测试。

## 根因分级

1. **确定的默认行为**：js/data.js defaultSettings.music=false，volume默认0.5；打开页面不会创建AudioContext。需用户开启音乐并交互。保存音乐开启后重开也需一次点击，这是应用延迟unlock设计，兼容浏览器自动播放交互限制；本测试未独立模拟强制resume拒绝，因此不将每个无声都归因于浏览器拒绝。
2. **可复现代码故障**：js/ui.js文档click调用unlock在change更新settings前。两项均false时，unlock提前return，不resume；随后change/configure只启动音乐timer，没有resume。于是suspended + musicRunning=true但实际峰值/RMS为0。下一次任意页面点击恢复running与信号。既有只检查timer的测试无法发现。
3. **确定偏低的数字电平**：sine峰值0.018 × master0.5 ≈0.009，即约−40.9dBFS；实测RMS约0.0018（−54.9dBFS）。650ms一音，0.6s指数衰减，非连续丰满配乐。音效单音0.04，音乐峰值低约6.9dB。是否主观听不到还取决于设备、音量与环境。
4. **未证实的外部原因**：系统/浏览器静音、输出设备、扬声器故障；headless不能排除这些。
5. **代码可见的诊断缺口**：audio.js构造/resume/suspend异常被空catch吞掉，无用户提示。此次正常播放/恢复没有观察到异常；异常缺提示为静态证据，非本次触发故障。

立即操作：设置→勾选原创暖调音乐→再点击页面一次（关闭设置也可）；音量调到50%至100%，保持游戏标签页在前台。仍无声时由用户自行检查系统音量混合器、浏览器标签页静音与输出设备。

若批准修复：在音频设置change更新设置并configure后，在该可信交互内调用unlock；对resume失败提示“点击启用声音”，不要把timer当作有声状态；独立调整音乐增益并试听校准。不要修改经济data默认值或平衡哈希。此次未实施修复。
