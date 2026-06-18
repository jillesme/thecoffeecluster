# Next/OpenNext Production Baseline Summary

Benchmark target: <https://thecoffeecluster.com/>  
Run date: 2026-06-18  
Plan: `BENCHMARL_PLAN.md` current production baseline.

## Commands run

- `pnpm install` — dependencies were already up to date.
- `pnpm run benchmark:remote-bundle --url https://thecoffeecluster.com/ --url https://thecoffeecluster.com/beans/85 --out-dir benchmark-results/next-prod/remote-bundle`
- 3 Lighthouse runs each for home/detail on desktop/mobile, saved under `benchmark-results/next-prod/lighthouse/`.
- 20 `curl` latency samples each for `/api/beans?page=1` and `/api/beans?page=6`, saved to `benchmark-results/next-prod/api/curl-api-latency.txt`.

Note: Chrome DevTools MCP-specific pagination tracing was not available in this environment, so browser metrics were captured with Lighthouse CLI instead. Cloudflare dashboard/platform p95 CPU/wall metrics were not captured locally.

## Baseline comparison table

| Category | Metric | Next/OpenNext baseline | vinext | Delta | Winner |
| --- | --- | ---: | ---: | ---: | --- |
| Bundle | Home JS KiB | 671.47 KiB | TBD | TBD | TBD |
| Bundle | Bean detail JS KiB | 671.61 KiB | TBD | TBD | TBD |
| Bundle | Unique JS KiB | 678.27 KiB | TBD | TBD | TBD |
| Lab CWV | Home desktop LCP median | 805 ms | TBD | TBD | TBD |
| Lab CWV | Home mobile LCP median | 2458 ms | TBD | TBD | TBD |
| Lab CWV | Home desktop CLS median | 0.000 | TBD | TBD | TBD |
| Lab CWV | Home mobile CLS median | 0.000 | TBD | TBD | TBD |
| Lab | Home desktop TBT median | 0 ms | TBD | TBD | TBD |
| Lab | Home mobile TBT median | 13 ms | TBD | TBD | TBD |
| API | `/api/beans?page=1` TTFB p95 | 629 ms | TBD | TBD | TBD |
| API | `/api/beans?page=6` TTFB p95 | 503 ms | TBD | TBD | TBD |
| Platform | Worker CPU p95 | Not captured | TBD | TBD | TBD |

## Remote bundle results

| Page | HTML | Script count | Page JS | Notes |
| --- | ---: | ---: | ---: | --- |
| Home/catalog | 26.16 KiB | 11 | 671.47 KiB | Main SSR page and client pagination JS. |
| Bean detail `/beans/85` | 13.39 KiB | 11 | 671.61 KiB | Dynamic detail page. |

- Unique scripts found: 12
- Total unique JS: 678.27 KiB
- Largest script: 216.97 KiB (`/_next/static/chunks/204-ac8d19c0b2aeeed3.js`)

## Lighthouse medians

| Target | Preset | Perf score | FCP | LCP | TBT | CLS | Speed Index | Total bytes | Server response |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | Desktop | 100 | 368 ms | 805 ms | 0 ms | 0.000 | 671 ms | 354.9 KB | 361 ms |
| Home | Mobile/perf | 96 | 2056 ms | 2458 ms | 13 ms | 0.000 | 2271 ms | 353.0 KB | 362 ms |
| Bean detail | Desktop | 99 | 310 ms | 871 ms | 0 ms | 0.050 | 758 ms | 267.2 KB | 195 ms |
| Bean detail | Mobile/perf | 72 | 1922 ms | 4341 ms | 16 ms | 0.222 | 2887 ms | 268.0 KB | 204 ms |

## Lighthouse best/worst ranges

| Target | Metric | Best | Worst |
| --- | --- | ---: | ---: |
| Home desktop | Perf score | 98 | 100 |
| Home desktop | LCP | 775 ms | 989 ms |
| Home mobile | Perf score | 95 | 96 |
| Home mobile | LCP | 2417 ms | 2481 ms |
| Bean desktop | Perf score | 99 | 99 |
| Bean desktop | LCP | 846 ms | 911 ms |
| Bean mobile | Perf score | 72 | 72 |
| Bean mobile | LCP | 4328 ms | 4356 ms |

## Network payload snapshot

From run `*-2.report.json` resource summaries:

| Target | Total requests | Total transfer | JS transfer | CSS transfer | Image transfer | Font transfer | Document transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home desktop | 35 | 354.9 KB | 181.8 KB | 9.5 KB | 95.8 KB | 53.2 KB | 7.4 KB |
| Home mobile | 27 | 353.1 KB | 181.9 KB | 9.5 KB | 95.9 KB | 53.2 KB | 7.4 KB |
| Bean desktop | 20 | 267.2 KB | 181.8 KB | 9.5 KB | 14.0 KB | 53.2 KB | 5.8 KB |
| Bean mobile | 20 | 268.1 KB | 182.0 KB | 9.5 KB | 14.0 KB | 53.2 KB | 5.8 KB |

## API latency

| Endpoint | Samples | Statuses | Response size | TTFB p50 | TTFB p75 | TTFB p95 | Total p50 | Total p75 | Total p95 |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/api/beans?page=1` | 20 | 200 | 1656–1657 B | 466 ms | 505 ms | 629 ms | 475 ms | 511 ms | 643 ms |
| `/api/beans?page=6` | 20 | 200 | 1700 B | 461 ms | 489 ms | 503 ms | 474 ms | 497 ms | 519 ms |

## Findings

- Home desktop and mobile are healthy: LCP is within the good threshold on both, CLS is 0, and TBT is negligible.
- Bean detail desktop is healthy, but bean detail mobile regresses: median LCP is 4.34 s and CLS is 0.222.
- Bean detail mobile LCP element is the main bean image (`bag-minimal-light.jpg`). Lighthouse reports the image is discoverable/eager but lacks a high fetch priority/preload signal, with ~2.9 s resource load delay in the sampled run.
- Bean detail mobile had one layout shift on `<main>` with score ~0.222.
- Static image cache lifetimes are short enough for Lighthouse to flag cache savings: home sample estimated 68 KiB savings, bean mobile sample estimated 14 KiB savings.
- Home desktop reported ~50 KiB unused JS savings; bean desktop reported ~46 KiB unused JS savings.
- Render-blocking CSS was minimal on desktop; bean mobile reported ~150 ms estimated savings for the main CSS file.

## Artifacts

- Remote bundle report: `benchmark-results/next-prod/remote-bundle/report.json`
- Lighthouse reports: `benchmark-results/next-prod/lighthouse/*.report.json` and `*.report.html`
- API latency raw samples: `benchmark-results/next-prod/api/curl-api-latency.txt`
