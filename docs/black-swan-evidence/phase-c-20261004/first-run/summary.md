# Phase C — rules 0.5 / save 4 / book 0.2

540 small-main diagnostic, NOT balance approval. No formal/holdout games run. No economic parameters changed.

Quantiles: empirical floor((n−1)q), descriptive observations, no IID market-week CIs. House Wilson95 per difficulty×policy has n=30 seeds; strategies paired. Market paths per difficulty 30; across difficulties 90 paths share only 30 seed clusters; do NOT claim independent 90 seeds. Money integer cents; bps100=1%; drawdown ppm10000=1%. Positive contribution=sum per-game positive realized profit, negative contributions separately; not positive-of-mean-net.

## Market (deduplicated)

|difficulty|paths|eligible|empty|swan hits/calls|ordinary hits/calls|attempt addition|actual addition|mean/year|primary ≥25 all/listed|primary clips|bounds|caps|
|---|---:|---:|---:|---|---|---|---|---:|---|---|---|---|
|easy|30|819|29|126/790|582/1404|46.3%|43.9%|4.20|95.3% / 95.7%|2.0%|0.1%|0.0%|
|standard|30|819|29|126/790|582/1404|46.3%|43.9%|4.20|94.6% / 95.7%|3.4%|0.1%|0.0%|
|challenge|30|819|29|126/790|582/1404|46.3%|43.9%|4.20|92.6% / 94.2%|3.4%|0.2%|0.0%|

## Six policies (30 seeds/group)

|difficulty|policy|house|Wilson95|house week p50|assets p50 cents|cash trough p50 cents|drawdown p50 ppm|stuck rate|warehouse mean cents|compact profit share|
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
|easy|conservative|36.7%|21.9%–54.5%|44|418101|28787|324932|93.3%|132000.0|0.0%|
|easy|random|10.0%|3.5%–25.6%|52|338126|28986|370341|60.0%|54133.3|24.3%|
|easy|momentum|13.3%|5.3%–29.7%|52|253827|8369|535331|70.0%|76000.0|32.0%|
|easy|value|90.0%|74.4%–96.5%|51|889713|7379|321835|90.0%|151466.7|50.5%|
|easy|event-aware|0.0%|0.0%–11.4%|—|170015|30575|614096|3.3%|60000.0|41.7%|
|easy|idle|0.0%|0.0%–11.4%|—|415400|396000|36000|0.0%|0.0|—|
|standard|conservative|0.0%|0.0%–11.4%|—|339192|29252|307917|83.3%|85000.0|0.0%|
|standard|random|0.0%|0.0%–11.4%|—|256616|19471|376773|63.3%|53666.7|28.9%|
|standard|momentum|0.0%|0.0%–11.4%|—|176412|8483|584208|53.3%|66000.0|34.4%|
|standard|value|70.0%|52.1%–83.3%|52|848693|3140|333684|93.3%|152000.0|50.0%|
|standard|event-aware|0.0%|0.0%–11.4%|—|119199|27651|650487|23.3%|49000.0|41.1%|
|standard|idle|0.0%|0.0%–11.4%|—|311000|292000|61538|0.0%|0.0|—|
|challenge|conservative|0.0%|0.0%–11.4%|—|270082|39541|379018|96.7%|70000.0|0.0%|
|challenge|random|0.0%|0.0%–11.4%|—|229102|30330|354977|86.7%|22400.0|29.9%|
|challenge|momentum|0.0%|0.0%–11.4%|—|145215|6601|593607|83.3%|28400.0|32.3%|
|challenge|value|33.3%|19.2%–51.2%|52|672859|6997|382036|100.0%|111600.0|53.2%|
|challenge|event-aware|0.0%|0.0%–11.4%|—|129857|26938|575808|53.3%|8400.0|41.2%|
|challenge|idle|0.0%|0.0%–11.4%|—|253000|236000|90909|0.0%|0.0|—|

## Warnings / separate proposals

- easy/random house rate below15%, Wilson95 {"low":0.03459988874733419,"high":0.25621082579184085}
- easy/momentum house rate below15%, Wilson95 {"low":0.053096554840547455,"high":0.296813266820363}
- easy/value compact combined positive share >=40%
- easy/event-aware house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- easy/event-aware compact combined positive share >=40%
- standard/conservative house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- standard/random house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- standard/momentum house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- standard/value compact combined positive share >=40%
- standard/event-aware house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- standard/event-aware compact combined positive share >=40%
- challenge/conservative house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- challenge/random house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- challenge/momentum house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- challenge/value compact combined positive share >=40%
- challenge/event-aware house rate below15%, Wilson95 {"low":0,"high":0.11351339317396876}
- challenge/event-aware compact combined positive share >=40%

Low house rates remain a separate balance issue; more shock is not evidence of balance improvement. Recommend a separately approved warehouse-policy sensitivity and visible-information policy review before any economic price proposal. No change is made here.

## Detailed machine evidence

- `report.json`: every §17.2 metric including first week / longest gap / event occurrence / filtering, role distributions, product×event×difficulty clipping/caps, structural overlap, all/listed/off-sale primary, positive profits and negative contributions.
- `outcomes.json`: all 540 actual ended outcomes, terminal and cash trough cents, drawdown ppm, path/action hashes.
- `market-paths.json`: only 90 paths (30 paired seed clusters), full weekly prices/listing and committed diagnostics.
- `metadata.json`: before-run seeds/source/catalog/policy/protected manifest; `verification.json`: protected byte verification and deterministic data hashes.
- `checkpoint.json`: content-addressed completed games; resume validates source/seed/policy/checkpoint hashes and reruns final aggregation, never restores a mid-game missing diagnostic prefix.

## Denominators and observational boundaries

swanAttempt = eligible AND nonempty candidates, the actual 16% gate calls. ordinaryAttempt = 42% gate HIT; ordinary gate calls = next count minus successful swan starts. Attempted addition = swan hits + ordinary gate hits; actual addition = committed started events. All rates include their explicit denominators in JSON.
NoNew weeks can contain ongoing/structural influence. Pure no-active/no-new role distributions are separately reported. Filtering counts are candidate event-week exclusions, first applicable reason only, no fabricated reasons on ineligible weeks.
Primary fixed catalog: route phone; tariff phone+collectible; efficiency gpu; heat ac; protection mask; both egg events eggs. ALL primary and currently LISTED primary are separate; headline secondary is not substituted.
Longest interarrival only uses observed event pairs; <2 starts is null. Window-censored longest gap is separate per path and not a complete interarrival. Reconstructed structural multiplier uses committed ordinary starts only; only existing structural overlap is flagged.
Bounds = committed raw≠clamped flags, not merely touching min/max. Caps = sum persist strictly beyond fixed role cap (equality not trigger), denominator active persist product-weeks, including onset computations; onset first shocks do not use the center. Non-onset persist center-used weeks are separate. Active-attribution strata overlap and must not be summed as global totals.

## Execution and limitations

Commands and pass/fail logs are in `commands.md`, `tests.log`, `run.log`. No browser/UI rerun or manual play; phase B approvals are prerequisites, not new economic proof. Formal 36000 requires separate authorization after review, parameter decision and source freeze.

## Runner use

`node simulation/black-swan.cjs --seeds 30 --set main --out docs/black-swan-evidence/phase-c-20261004`
Existing output is refused unless `--resume yes`; resume validates hashes, refuses tampered or stale records, and has no silent skip. Small run limit is 30 main seeds. Future formal modes: `--mode formal --seeds 1000 --set main|holdout --approved yes` only after separate authorization; never executed in this phase.
Formal outputs must use NEW distinct directories. Historical c1 remains byte-identical and cannot load 0.5 by this entry.
