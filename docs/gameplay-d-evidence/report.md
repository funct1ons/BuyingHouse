# Milestone D test run

Date: 2026-10-04. Working directory: `C:\files\code\BuyingHouse`. `ACCEPTANCE_DIR=gameplay-d-evidence` was set for every command below.

Browser for every Edge script: Microsoft Edge headless, launched from `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` by `tests/cdp-helper.cjs`. CDP `Browser` field: `Edg/154.0.4258.53`. This run did not launch Playwright. The Edge user-agent string includes a `HeadlessChrome` compatibility token; that process is Edge, not Google Chrome.

No production file under `js/`, `simulation/`, `css/`, or `index.html` was edited. No WAV file was regenerated (`docs/av-samples/*.wav` mtimes remain 2026-10-03). Economy files were not touched.

Logs of this run: `docs/gameplay-d-evidence/logs/`. `tests/acceptance-final.cjs` is the only listed script that honors `ACCEPTANCE_DIR`; its JSON and PNGs are in this directory. Scripts that ignore `ACCEPTANCE_DIR` wrote their real output to the fixed paths named under each command. Those files were not replaced with older reports afterward.

## Exit codes

| Command | Exit | First failure line |
|---|---:|---|
| `node tests/run.cjs` | 0 | none |
| `node tests/review-b2.cjs` | 0 | none |
| `node tests/ui-interaction.cjs` | 0 | none |
| `node tests/acceptance-final.cjs` | 0 | none |
| `node tests/acceptance-supplement.cjs` | 0 | none |
| `node tests/av-audio-director.cjs` | 0 | none |
| `node tests/av-audio.cjs` | 0 | none |
| `node tests/av-integration.cjs --idle 60` | 0 | none |
| `node tests/av-visual.cjs` | 0 | none |
| `node tests/milestone-b-edge.cjs` | 0 | none |
| `node tests/milestone-b-edge-migrate.cjs` | 0 | none |
| `node tests/milestone-b-edge-review.cjs` | 0 | none |
| `node tests/milestone-d-edge.cjs` (first, bad assertion) | 1 | `FAIL key 9 opened a card when only 8 are visible rice` |
| `node tests/milestone-d-edge.cjs` (rerun after the assertion fix) | 0 | none |

The first `milestone-d-edge.cjs` failure was a test bug: a closed `<dialog>` still contained the previous trade markup, so a key that did not open a card looked open. The assertion now requires `dialog.open`. The rerun is the result for that file. The twelve requested commands all exited 0 on their only run.

## Rice shelf

Searched `tests/` before editing. Hardcoded `product-rice` clicks are in `acceptance-final.cjs`, `acceptance-supplement.cjs`, and `av-visual.cjs`. `suite.js` calls `ensureListed` before engine buys, so it does not assume the 8-item shelf.

Those three UI scripts exited 0, so rice was on the shelf for the seeds they actually clicked (`QA-FINAL` week 1, `QA-FIXTURE` week 52, `AV-VISUAL` week 9, and the supplement's default timestamp seed). No fixture was changed and no assertion was loosened. `QA-FIXTURE` week 1 does not list rice, but no executed check buys rice on that week-1 shelf.

## What each passing command verified

### `node tests/run.cjs` — exit 0

`21 passed, 0 failed`. Core engine, save, listing, and validation checks in `tests/suite.js`. Not a browser run.

### `node tests/review-b2.cjs` — exit 0

Stdout ended with `review-b2 passed`. All 12 `check()` calls passed, including `第52周缺货回收成功且不能进入第53周`: an off-shelf holding was sold at week 52, turnover increased, and `next` into week 53 was rejected. This is a Node engine check, not an Edge click.

### `node tests/ui-interaction.cjs` — exit 0

Real Edge `file://` DOM run. Wrote `docs/ui-evidence/` (ignores `ACCEPTANCE_DIR`): `report.json`, `market-1366.png`, `market-1600.png`, `market-1920.png`, `market-2560.png`, `result.png`.

Verified: week 1 start, invalid quantity disables submit, buy 1 and sell-all on a dynamically listed id, next week, search filters to one card, no page overflow and next-week visible at 1366, 1600, 1920, and 2560, settings volume and music loop, manual save writes v3 and does not create v2, continue restores week 2, UI reaches week 52, ending requires confirmation, one confirm ends the year and opens the result dialog. It does not cover 125% or 150% sizes, and it does not perform a week-52 buyback.

### `node tests/acceptance-final.cjs` — exit 0

Real Edge `file://`. Honored `ACCEPTANCE_DIR`. Wrote `docs/gameplay-d-evidence/report.json` and the PNGs in this directory. 28 checks, 0 failed, 0 console errors. `requests` was empty, so this page load made no `http`, `https`, or `wss` request. Browser field `Edg/154.0.4258.53`.

Verified, among others:

- Viewports 1366×768, 1600×900, 1920×1080, 2560×1440, plus 125% equivalent 1536×864 and 150% equivalent 1280×720, all at `deviceScaleFactor` 1. Each passed `scrollWidth <= innerWidth`, `scrollHeight <= innerHeight`, and next-week inside the viewport.
- `natural no-house complete52 and no53 duplicate`: week stays 52, status `ended`, no house, and a further next does not change the snapshot.
- `fixture owned house week52 trading and settlement`: week-52 rice buy and sell, then settlement with a house. Rice was listed that week, so this is an on-shelf trade, not the off-shelf buyback.
- `corrupt original preserved until explicit overwrite`: a broken v3 and untouched v2 survive next and manual save until the replace confirm writes v3.
- `no external page requests and no runtime console errors`.

### `node tests/acceptance-supplement.cjs` — exit 0

Real Edge `file://`. Ignores `ACCEPTANCE_DIR` and overwrote `docs/acceptance-evidence/supplement.json` (mtime 2026-10-04T06:41:12Z). Browser field `Edg/154.0.4258.53`.

5 checks passed, 0 errors: music starts one timer and clears it, sound off, rapid submit commits rice once (`inventory.rice.qty === 1` and `trades === 1`), dialog Tab stays inside the dialog for 22 steps.

### `node tests/av-audio-director.cjs` — exit 0

Node only. `17/17 passed`. Phase mapping from public progress, including week 45 sprint and ending phases. Not a listening test.

### `node tests/av-audio.cjs` — exit 0

Real Edge `file://` via `tests/av-preview.html`. `96/96 passed`, `no page exceptions []`. Did not pass `--samples`, and no WAV mtime changed. Overwrote `docs/av-samples/report.json` only. Digital measurements, not a listening claim.

### `node tests/av-integration.cjs --idle 60` — exit 0

Real Edge `file://` of `index.html`. Ignores `ACCEPTANCE_DIR` and wrote `docs/av-visual-evidence/integration-report.json`. Summary 24 passed, 0 failed. Idle measurement in that report: 60.01s, TaskDuration 0.204s (0.341% of wall), music running. Not a listening claim.

### `node tests/av-visual.cjs` — exit 0

Real Edge `file://`. Ignores `ACCEPTANCE_DIR`. Deleted existing jpg/png under `docs/av-visual-evidence/`, then wrote this run's screenshots and `report.json` (finished 2026-10-04T06:47:50Z). Summary 93 passed, 0 failed. Browser field `Edg/154.0.4258.53`.

Verified layout at 1366×768, 1600×900, 1920×1080, 2560×1440, `1920x1080@125` (1536×864, deviceScaleFactor 1.25), and `1920x1080@150` (1280×720, deviceScaleFactor 1.5). `no external requests` passed: 180 `file:` requests, 0 `http`/`https`/`wss`. Also passed `system reduced motion disables lamp/surge animation` (computed `animationName === 'none'`). That check does not assert the `surge` class gate; the class gate is in `milestone-d-edge.cjs`.

The script's default idle is 60s even without `--idle`. This invocation was exactly `node tests/av-visual.cjs`. `idle 60s TaskDuration < 3%` passed.

### `node tests/milestone-b-edge.cjs` — exit 0

Real Edge `file:///C:/files/code/BuyingHouse/index.html`. `failures: []`, `consoleErrors: []`, `external: []` (page `http`/`https`/`wss` requests). Week 1 opened with 8 listed and 8 cards, price book `0.2`. Next reached week 2. Continue restored week 2 and matched a separate engine's next from the pre-reload snapshot.

### `node tests/milestone-b-edge-migrate.cjs` — exit 0

Real Edge `file://`. `failures: []`, `consoleErrors: []`. Migrated the v2 fixture without overwriting v2. Result: week 4, cash 6233900, gold 1, price book `0.2`, backup `homeyear.save.backup.bcdb6797abf6f5ae`. Sell preview included 回收报价 ¥233.62, 回收折价 ¥20.32, and 手续费 ¥2.34. This is legacy buyback at week 4, not a week-52 buyback.

### `node tests/milestone-b-edge-review.cjs` — exit 0

Real Edge `file://`. `failures: []`, `consoleErrors: []`. Overwrote PNGs in `docs/gameplay-evidence/` (fixed path). After this run, `week2-bulletin-1600.png` was the same image as `week2-trade-1600.png`. This report does not claim those D-written 1600 files were distinct. The reviewer later ran `node tests/recapture-1600-bulletin.cjs` and restored two different files: bulletin `fae8f86df37dd40c10d727c0f4b1001ff06dac9de6410ae11968575557f719d4`, trade `2350ff8ee4c3c2847c585ff4695d1555f04524a7bcd54cb3b8b03bf3558c8538`.

Verified from this run's JSON:

- Week 2 sort is `focus` / `本周关注`.
- No horizontal overflow at 1366×768 or 1600×900 (`scrollWidth` equals the viewport).
- Off-shelf sell of `rice` showed 回收报价 and a disabled buy control, then qty became 0. That happened before week 52.
- Damaged v3 (`BROKEN`) plus a v2 fixture: migrate's first confirm is not enough. The script fails unless a second dialog contains `替换损坏的 v3`. Cancel left v3 as `BROKEN`. A second confirm then migrated (week 4, v2 text unchanged, v3 parseable). `notes.damaged` is `{week:4, v2:true, v3ok:true}`.
- Settings import of the v2 fixture left `homeyear.save.v2` as `LOCAL-ORIGINAL`, week 4, cash 6233900, exited goods visible.
- Continue of an ended migrated save opened the result dialog with best `常备药`, worst `相机`, and 20 product lines.

## Added behavioral test

`tests/milestone-d-edge.cjs` is new. No existing test sent keys 1–9 against visible card order, gated `surge` on `abs(changeBps) >= 2500`, or checked that continue/import do not replay that class. `av-visual.cjs` only checks that reduced motion sets `animationName` to `none`.

Corrected rerun exit 0. Evidence: `docs/gameplay-d-evidence/keys-surge.json`. Page `https`/`wss` list was empty. Console errors: 0. Browser field `Edg/154.0.4258.53`.

Verified on the live DOM:

- Default shelf had 8 cards. Key 1 opened that first visible id (`rice` on seed `KEY-D1`, which is also `HomeYear.products[0]` for that shelf). Key 9 did not open a dialog.
- Search plus price sort showed 12 cards starting at `mask`, not `HomeYear.products[0]`. Keys 1–9 opened `mask`, `eggs`, `umbrella`, `pork`, `fruit`, `rice`, `coat`, `phone`, `ac`, matching that visible order. Key 6 opening `rice` was the sixth visible card, not a catalog fallback.
- Next on seed `SURGE-45` reached week 24 with a fresh headline on `fruit` at exactly 2500 bps, animation `normal`, system reduced-motion off. The only `.surge` card was `fruit`.
- Import of that week-24 snapshot left the fresh 2500 bps headline and added no `.surge`.
- Reload and continue restored week 24 with the same fresh headline and no `.surge`.
- Next on `SURGE-24` reached week 5 with a fresh `mask` headline at 2499 bps and no `.surge`.
- Next on `SURGE-49` reached week 42 with no fresh headline, 8 cards, and no `.surge`.
- Animation setting `reduced`, same 2500 bps `fruit` headline: no `.surge`.
- Animation `normal` plus emulated `prefers-reduced-motion: reduce` (`matchMedia` true), same 2500 bps headline: no `.surge`.

A missing card, missing control, or wrong opened id fails the test. The 2499 and 2500 cases are exact magnitudes from this run, not skipped thresholds.
