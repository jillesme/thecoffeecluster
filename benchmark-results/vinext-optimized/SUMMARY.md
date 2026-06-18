# vinext-optimized Production Benchmark Summary

Benchmark target: <https://thecoffeecluster.com/>  
Run date: 2026-06-18  
Plan: `BENCHMARL_PLAN.md` repeatable production benchmark, saved as `vinext-optimized`.

## Commands run

- `pnpm run benchmark:remote-bundle --url https://thecoffeecluster.com/ --url https://thecoffeecluster.com/beans/85 --out-dir benchmark-results/vinext-optimized/remote-bundle`
- 3 Lighthouse runs each for home/detail on desktop/mobile, saved under `benchmark-results/vinext-optimized/lighthouse/`.
- 20 `curl` latency samples each for `/api/beans?page=1` and `/api/beans?page=6`, saved to `benchmark-results/vinext-optimized/api/curl-api-latency.txt`.

Note: Chrome DevTools MCP pagination tracing and Cloudflare dashboard/platform CPU/wall metrics were not captured locally, matching the earlier benchmark limitations.

## Baseline comparison table

| Category | Metric | Next/OpenNext baseline | vinext-optimized | Delta | Winner |
| --- | ---: | ---: | ---: | ---: | --- |
| Bundle | Home JS KiB | 671.47 KiB | 221.49 KiB | -449.98 KiB (-67%) | vinext-optimized |
| Bundle | Bean detail JS KiB | 671.61 KiB | 221.49 KiB | -450.12 KiB (-67%) | vinext-optimized |
| Bundle | Unique JS KiB | 678.27 KiB | 221.49 KiB | -456.78 KiB (-67%) | vinext-optimized |
| Lab CWV | Home desktop LCP median | 805 ms | 757 ms | -48 ms | vinext-optimized |
| Lab CWV | Home mobile LCP median | 2458 ms | 2667 ms | +209 ms | Next/OpenNext |
| Lab CWV | Home desktop CLS median | 0.000 | 0.000 | 0.000 | Tie |
| Lab CWV | Home mobile CLS median | 0.000 | 0.000 | 0.000 | Tie |
| Lab | Home desktop TBT median | 0 ms | 0 ms | 0 ms | Tie |
| Lab | Home mobile TBT median | 13 ms | 0 ms | -13 ms | vinext-optimized |
| Lab CWV | Bean mobile LCP median | 4341 ms | 2444 ms | -1897 ms | vinext-optimized |
| Lab CWV | Bean mobile CLS median | 0.222 | 0.243 | +0.021 | Next/OpenNext |
| API | `/api/beans?page=1` TTFB p95 | 629 ms | 472 ms | -157 ms | vinext-optimized |
| API | `/api/beans?page=6` TTFB p95 | 503 ms | 564 ms | +61 ms | Next/OpenNext |
| Platform | Worker CPU p95 | Not captured | Not captured | N/A | N/A |

## Remote bundle results

| Page | HTML | Script count | Page JS | Notes |
| --- | ---: | ---: | ---: | --- |
| Home/catalog | 31.68 KiB | 2 | 221.49 KiB | Main page and client pagination JS. |
| Bean detail `/beans/85` | 26.12 KiB | 2 | 221.49 KiB | Dynamic detail page. |

- Unique scripts found: 2
- Total unique JS: 221.49 KiB
- Largest script: 189.04 KiB (`/_next/static/chunks/index-BctXlPAW.js`)

## Lighthouse medians

| Target | Preset | Perf score | FCP | LCP | TBT | CLS | Speed Index | Total bytes | Server response |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Desktop | 99 | 419 ms | 757 ms | 0 ms | 0.000 | 782 ms | 391.1 KB | 465 ms |
| Home | Mobile/perf | 94 | 2292 ms | 2667 ms | 0 ms | 0.000 | 2482 ms | 391.3 KB | 473 ms |
| Bean detail | Desktop | 99 | 442 ms | 704 ms | 0 ms | 0.051 | 750 ms | 308.3 KB | 430 ms |
| Bean detail | Mobile/perf | 83 | 2123 ms | 2444 ms | 0 ms | 0.243 | 2308 ms | 308.2 KB | 462 ms |

## Lighthouse best/worst ranges

| Target | Metric | Best | Worst |
| --- | --- | ---: | ---: |
| Home desktop | Perf score | 100 | 99 |
| Home desktop | LCP | 739 ms | 829 ms |
| Home mobile | Perf score | 94 | 93 |
| Home mobile | LCP | 2661 ms | 2693 ms |
| Bean desktop | Perf score | 100 | 99 |
| Bean desktop | LCP | 688 ms | 724 ms |
| Bean mobile | Perf score | 84 | 82 |
| Bean mobile | LCP | 2431 ms | 2542 ms |

## Network payload snapshot

From run `*-2.report.json` resource summaries:

| Target | Total requests | Total transfer | JS transfer | CSS transfer | Image transfer | Font transfer | Document transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 40 | 391.1 KB | 195.0 KB | 8.9 KB | 95.8 KB | 77.8 KB | 8.9 KB |
| Home mobile | 40 | 391.3 KB | 195.0 KB | 8.9 KB | 95.9 KB | 77.8 KB | 9.0 KB |
| Bean desktop | 36 | 308.3 KB | 194.0 KB | 8.9 KB | 14.0 KB | 77.8 KB | 8.9 KB |
| Bean mobile | 36 | 308.2 KB | 193.8 KB | 8.9 KB | 14.0 KB | 77.8 KB | 8.9 KB |

## API latency

| Endpoint | Samples | Statuses | Response size | TTFB p50 | TTFB p75 | TTFB p95 | Total p50 | Total p75 | Total p95 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/api/beans?page=1` | 20 | 200 | 1656–1657 B | 392 ms | 452 ms | 472 ms | 456 ms | 479 ms | 495 ms |
| `/api/beans?page=6` | 20 | 200 | 1699–1700 B | 442 ms | 492 ms | 564 ms | 456 ms | 504 ms | 577 ms |

## Findings

- `vinext-optimized` keeps the major JS reduction: unique JS is 221.49 KiB versus the Next/OpenNext baseline at 678.27 KiB (-67%).
- Compared with the prior `vinext-prod` run, total Lighthouse transfer improved substantially: home desktop dropped from ~471.5 KB to ~391.1 KB, and bean mobile dropped from ~377.9 KB to ~308.2 KB. Font transfer is now ~77.8 KB instead of ~150 KB.
- Home desktop is now slightly faster than the Next/OpenNext baseline on LCP (757 ms vs 805 ms). Home mobile remains slower than the baseline (2667 ms vs 2458 ms), but much better than the prior vinext run (2993 ms).
- Bean detail mobile improved dramatically versus both previous runs: median LCP is 2444 ms, down from 4341 ms on the Next/OpenNext baseline and 5031 ms on the previous vinext run.
- CLS remains the weak spot on bean detail: desktop CLS is ~0.051 and mobile CLS is ~0.243, slightly worse than the previous 0.222 mobile baseline and above the ≤0.1 good threshold.
- TBT is excellent across all vinext-optimized Lighthouse runs: median 0 ms everywhere.
- API page 1 p95 TTFB improved versus baseline; API page 6 still has a worse p95 tail than baseline, though it is better than the previous vinext run.

## Artifacts

- Remote bundle report: `benchmark-results/vinext-optimized/remote-bundle/report.json`
- Lighthouse reports: `benchmark-results/vinext-optimized/lighthouse/*.report.json` and `*.report.html`
- API latency raw samples: `benchmark-results/vinext-optimized/api/curl-api-latency.txt`
