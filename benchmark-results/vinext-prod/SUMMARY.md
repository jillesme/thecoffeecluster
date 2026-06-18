# vinext Production Benchmark Summary

Benchmark target: <https://thecoffeecluster.com/>  
Run date: 2026-06-18  
Plan: `BENCHMARL_PLAN.md` vinext production rerun.

## Commands run

- `pnpm run benchmark:remote-bundle --url https://thecoffeecluster.com/ --url https://thecoffeecluster.com/beans/85 --out-dir benchmark-results/vinext-prod/remote-bundle`
- 3 Lighthouse runs each for home/detail on desktop/mobile, saved under `benchmark-results/vinext-prod/lighthouse/`.
- 20 `curl` latency samples each for `/api/beans?page=1` and `/api/beans?page=6`, saved to `benchmark-results/vinext-prod/api/curl-api-latency.txt`.

Note: Chrome DevTools MCP-specific pagination tracing is not available in this environment, matching the baseline limitation. Cloudflare dashboard/platform p95 CPU/wall metrics were not captured locally.

## Baseline comparison table

| Category | Metric | Next/OpenNext baseline | vinext | Delta | Winner |
| --- | --- | ---: | ---: | ---: | --- |
| Bundle | Home JS KiB | 671.47 KiB | 221.23 KiB | -450.24 KiB (-67%) | vinext |
| Bundle | Bean detail JS KiB | 671.61 KiB | 221.23 KiB | -450.38 KiB (-67%) | vinext |
| Bundle | Unique JS KiB | 678.27 KiB | 221.23 KiB | -457.04 KiB (-67%) | vinext |
| Lab CWV | Home desktop LCP median | 805 ms | 938 ms | +133 ms | Next/OpenNext |
| Lab CWV | Home mobile LCP median | 2458 ms | 2993 ms | +535 ms | Next/OpenNext |
| Lab CWV | Home desktop CLS median | 0.000 | 0.000 | 0.000 | Tie |
| Lab CWV | Home mobile CLS median | 0.000 | 0.000 | 0.000 | Tie |
| Lab | Home desktop TBT median | 0 ms | 0 ms | 0 ms | Tie |
| Lab | Home mobile TBT median | 13 ms | 0 ms | -13 ms | vinext |
| API | `/api/beans?page=1` TTFB p95 | 629 ms | 574 ms | -55 ms | vinext |
| API | `/api/beans?page=6` TTFB p95 | 503 ms | 635 ms | +132 ms | Next/OpenNext |
| Platform | Worker CPU p95 | Not captured | Not captured | N/A | N/A |

## Remote bundle results

| Page | HTML | Script count | Page JS | Notes |
| --- | ---: | ---: | ---: | --- |
| Home/catalog | 33.60 KiB | 2 | 221.23 KiB | Main SSR page and client pagination JS. |
| Bean detail `/beans/85` | 20.12 KiB | 2 | 221.23 KiB | Dynamic detail page. |

- Unique scripts found: 2
- Total unique JS: 221.23 KiB
- Largest script: 188.78 KiB (`/_next/static/chunks/index-BbxwswSX.js`)
- HTML increased versus baseline: home +7.44 KiB, bean detail +6.73 KiB.

## Lighthouse medians

| Target | Preset | Perf score | FCP | LCP | TBT | CLS | Speed Index | Total bytes | Server response |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Desktop | 99 | 457 ms | 938 ms | 0 ms | 0.000 | 823 ms | 471.4 KB | 447 ms |
| Home | Mobile/perf | 90 | 2597 ms | 2993 ms | 0 ms | 0.000 | 2804 ms | 462.6 KB | 498 ms |
| Bean detail | Desktop | 99 | 503 ms | 923 ms | 0 ms | 0.050 | 864 ms | 377.9 KB | 233 ms |
| Bean detail | Mobile/perf | 66 | 2481 ms | 5031 ms | 0 ms | 0.222 | 3495 ms | 377.9 KB | 258 ms |

## Lighthouse best/worst ranges

| Target | Metric | Best | Worst |
| --- | --- | ---: | ---: |
| Home desktop | Perf score | 99 | 99 |
| Home desktop | LCP | 899 ms | 957 ms |
| Home mobile | Perf score | 91 | 90 |
| Home mobile | LCP | 2987 ms | 3047 ms |
| Bean desktop | Perf score | 99 | 98 |
| Bean desktop | LCP | 851 ms | 1021 ms |
| Bean mobile | Perf score | 67 | 66 |
| Bean mobile | LCP | 4994 ms | 5057 ms |

## Network payload snapshot

From run `*-2.report.json` resource summaries:

| Target | Total requests | Total transfer | JS transfer | CSS transfer | Image transfer | Font transfer | Document transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 47 | 471.5 KB | 191.5 KB | 9.1 KB | 95.9 KB | 150.5 KB | 9.6 KB |
| Home mobile | 43 | 462.6 KB | 191.6 KB | 9.1 KB | 95.9 KB | 150.5 KB | 9.4 KB |
| Bean desktop | 38 | 378.1 KB | 191.7 KB | 9.1 KB | 14.0 KB | 150.4 KB | 7.8 KB |
| Bean mobile | 38 | 377.9 KB | 191.6 KB | 9.1 KB | 14.0 KB | 150.5 KB | 7.7 KB |

## API latency

| Endpoint | Samples | Statuses | Response size | TTFB p50 | TTFB p75 | TTFB p95 | Total p50 | Total p75 | Total p95 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/api/beans?page=1` | 20 | 200 | 1656–1657 B | 415 ms | 483 ms | 574 ms | 459 ms | 498 ms | 606 ms |
| `/api/beans?page=6` | 20 | 200 | 1699–1700 B | 464 ms | 515 ms | 635 ms | 489 ms | 523 ms | 775 ms |

## Findings

- vinext significantly reduces top-level raw JS discovered by the remote bundle script: unique JS drops from 678.27 KiB to 221.23 KiB (-67%).
- Lighthouse network transfer is not smaller overall: total transfer increased on every tested page, mainly because font transfer increased from ~53 KB baseline to ~150 KB and total request count increased.
- Home remains within good Core Web Vitals thresholds, but Lighthouse medians regressed: home mobile LCP increased from 2.46 s to 2.99 s and performance score dropped from 96 to 90.
- Bean detail mobile remains the main problem area and regressed further: median LCP increased from 4.34 s to 5.03 s and CLS remains high at 0.222.
- TBT is excellent across all vinext runs: median 0 ms everywhere.
- API page 1 p95 TTFB improved by 55 ms, but API page 6 p95 TTFB regressed by 132 ms and total p95 had a 775 ms tail due to outlier samples.

## LCP regression diagnosis

The mobile LCP element is the same bean image in both runs: `Deep Estate` from `https://img.thecoffeecluster.com/beans/bag-minimal-light.jpg`.

| Target | Build | LCP | TTFB phase | Resource load delay | Resource load duration | Element render delay |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Home mobile | Next/OpenNext | 2458 ms | 639 ms | 218 ms | 1554 ms | 26 ms |
| Home mobile | vinext | 2993 ms | 728 ms | 94 ms | 2149 ms | 24 ms |
| Bean detail mobile | Next/OpenNext | 4341 ms | 472 ms | 2973 ms | 912 ms | 22 ms |
| Bean detail mobile | vinext | 5031 ms | 467 ms | 3599 ms | 936 ms | 17 ms |

Likely causes:

- Home mobile regressed mostly because the LCP image download itself took longer under Lighthouse throttling. The image starts at about the same time, but finishes later. vinext downloads 11 high-priority font files (~150 KB) instead of 2 font files (~53 KB), increasing bandwidth contention despite the smaller app JS.
- Bean detail mobile regressed mostly because the LCP image request starts later: ~4077 ms in the vinext run vs ~3396 ms in the baseline run. The image has `loading="eager"` and `fetchpriority="high"`, but Lighthouse still records a larger resource load delay.
- Lighthouse reports no preconnect to `https://img.thecoffeecluster.com`; on the bean detail mobile run it estimates ~300 ms LCP savings from preconnecting that image origin.
- Render-blocking CSS still costs ~150 ms on mobile.

## Artifacts

- Remote bundle report: `benchmark-results/vinext-prod/remote-bundle/report.json`
- Lighthouse reports: `benchmark-results/vinext-prod/lighthouse/*.report.json` and `*.report.html`
- API latency raw samples: `benchmark-results/vinext-prod/api/curl-api-latency.txt`
