# Benchmark Plan: Current Next.js Production vs. vinext

This plan captures the baseline for the currently deployed app at <https://thecoffeecluster.com/> before migrating to [vinext](https://vinext.dev/), then repeats the same checks after the vinext migration.

## Goals

- Quantify current production bundle size and page weight.
- Capture user-facing performance metrics, especially Core Web Vitals.
- Measure app-specific latency signals for the coffee catalog and bean detail flows.
- Keep the benchmark repeatable so Next.js/OpenNext and vinext results can be compared fairly.

## Pages and flows to test

| Target | URL / action | Why |
| --- | --- | --- |
| Home/catalog | `https://thecoffeecluster.com/` | Main SSR page, initial bean grid, client pagination JS. |
| Bean detail | `https://thecoffeecluster.com/beans/85` | Dynamic route and image/detail rendering. Update ID if this record changes. |
| Beans API page 1 | `https://thecoffeecluster.com/api/beans?page=1` | Server/data latency without browser rendering. |
| Beans API later page | `https://thecoffeecluster.com/api/beans?page=6` | Pagination path used by the client. |
| Client pagination | Home page → click page 2/3 | Measures hydration, client fetch, toast timing, and layout stability during updates. |

## Baseline dimensions

### 1. Production bundle and network payload

Use both a local build artifact benchmark and a remote production benchmark.

#### Remote production JS bundles

The repo already has `scripts/benchmark-remote-bundle.py` and `pnpm benchmark:remote-bundle`.

```bash
mkdir -p benchmark-results/next-prod
pnpm run benchmark:remote-bundle \
  --url https://thecoffeecluster.com/ \
  --url https://thecoffeecluster.com/beans/85 \
  --out-dir benchmark-results/next-prod/remote-bundle
```

Note: with this repo's `pnpm` script wiring, do **not** include an extra standalone `--` before the benchmark flags. `pnpm benchmark:remote-bundle -- ...` passes the literal `--` through to Python and fails with `unrecognized arguments: --`.

Record from `report.json`:

- Per-page HTML bytes.
- Per-page script count.
- Per-page total script KiB.
- Deduplicated unique script KiB.
- Largest script URL and size.

#### Browser network payload

Use Chrome DevTools MCP or Lighthouse to capture transfer size, decoded size, and request count by resource type.

Track:

- Document transfer size and TTFB.
- JS transfer / decoded size.
- CSS transfer / decoded size.
- Image transfer size.
- Font transfer size, if any.
- Total request count.
- Cache headers for static assets.
- Largest network dependency chains.

### 2. Core Web Vitals and Lighthouse metrics

Core Web Vitals to record:

| Metric | Good threshold | Notes |
| --- | ---: | --- |
| LCP | ≤ 2.5s | Loading performance. Capture LCP element and breakdown. |
| INP | ≤ 200ms | Field metric; use DevTools interaction testing and/or RUM. Lighthouse cannot directly measure INP. |
| CLS | ≤ 0.1 | Visual stability, especially during image load and pagination skeleton swaps. |

Supporting lab metrics:

| Metric | Good threshold / target | Notes |
| --- | ---: | --- |
| TTFB | ≤ 800ms | Important for SSR + database latency. |
| FCP | ≤ 1.8s | Useful for diagnosing render-blocking CSS/JS. |
| TBT | ≤ 200ms | Lab proxy for interactivity / INP risk. |
| Speed Index | ≤ 3.4s | Visual progress metric. |
| Lighthouse performance score | ≥ 90 | Lighthouse score is weighted: FCP 10%, Speed Index 10%, LCP 25%, TBT 30%, CLS 25%. |

Reference: web.dev Core Web Vitals recommends LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at the 75th percentile across mobile and desktop users.

### 3. Chrome DevTools MCP audit

If Chrome DevTools MCP is available, run this for each page in an incognito/fresh context with cache disabled.

Audit checklist:

- Navigate to page.
- Start performance trace with reload.
- Capture metrics: LCP, CLS, FCP, TTFB, long tasks, scripting time.
- Analyze insights:
  - `LCPBreakdown`
  - `CLSCulprits`
  - `RenderBlocking`
  - `DocumentLatency`
  - `NetworkRequestsDepGraph`
- List network requests for `Document`, `Script`, `Stylesheet`, `Font`, `Image`, `Fetch`.
- Take an accessibility snapshot for obvious regressions while migrating.

For the pagination flow:

- Load home page and wait for hydration.
- Start a trace.
- Click pagination page 2.
- Stop trace after grid is replaced and toast appears.
- Record fetch duration, long tasks, layout shifts, and whether the click response feels blocked.

### 4. Lighthouse CLI / PageSpeed repeatable lab runs

Run multiple times because Lighthouse has natural variability.

```bash
mkdir -p benchmark-results/next-prod/lighthouse

for i in 1 2 3; do
  pnpm dlx lighthouse https://thecoffeecluster.com/ \
    --preset=desktop \
    --output=json \
    --output=html \
    --output-path=benchmark-results/next-prod/lighthouse/home-desktop-$i \
    --chrome-flags="--headless=new --no-sandbox"

  pnpm dlx lighthouse https://thecoffeecluster.com/ \
    --preset=perf \
    --output=json \
    --output=html \
    --output-path=benchmark-results/next-prod/lighthouse/home-mobile-$i \
    --chrome-flags="--headless=new --no-sandbox"
done
```

Repeat for the bean detail page.

Record median and best/worst for:

- Performance score.
- FCP.
- LCP.
- TBT.
- CLS.
- Speed Index.
- Total Byte Weight.
- Unused JS/CSS diagnostics.
- Render-blocking resources.

### 5. API and server/data latency

Measure direct API latency separately from full page rendering.

```bash
mkdir -p benchmark-results/next-prod/api

for url in \
  "https://thecoffeecluster.com/api/beans?page=1" \
  "https://thecoffeecluster.com/api/beans?page=6"; do
  for i in {1..20}; do
    curl -sS -o /dev/null \
      -w "$url run=$i status=%{http_code} dns=%{time_namelookup}s connect=%{time_connect}s tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s size=%{size_download}\n" \
      "$url"
  done
done | tee benchmark-results/next-prod/api/curl-api-latency.txt
```

Record:

- p50 / p75 / p95 total duration.
- p50 / p75 / p95 TTFB.
- Response size.
- HTTP status correctness.
- Whether results differ between Hyperdrive/direct modes if the app exposes a toggle or cookie for that.

### 6. Worker/platform metrics

From Cloudflare dashboard or logs, capture the same production window where possible:

- Request count.
- Error rate.
- Worker CPU time p50/p95.
- Worker wall time p50/p95.
- Subrequest count.
- Cold start signals, if available.
- Cache hit ratio for static assets.

If using Wrangler tail during a manual run, keep a timestamped log:

```bash
pnpm wrangler tail the-coffee-cluster --format=json > benchmark-results/next-prod/wrangler-tail.jsonl
```

## Output template

Create one summary file per benchmark run, for example:

```text
benchmark-results/
  next-prod/
    SUMMARY.md
    remote-bundle/report.json
    lighthouse/*.report.json
    lighthouse/*.report.html
    api/curl-api-latency.txt
  vinext-prod/
    SUMMARY.md
    ...same structure...
```

`SUMMARY.md` should include:

| Category | Metric | Next/OpenNext baseline | vinext | Delta | Winner |
| --- | --- | ---: | ---: | ---: | --- |
| Bundle | Home JS KiB | TBD | TBD | TBD | TBD |
| Bundle | Unique JS KiB | TBD | TBD | TBD | TBD |
| Lab CWV | Home LCP median | TBD | TBD | TBD | TBD |
| Lab CWV | Home CLS median | TBD | TBD | TBD | TBD |
| Lab | Home TBT median | TBD | TBD | TBD | TBD |
| API | `/api/beans?page=1` TTFB p95 | TBD | TBD | TBD | TBD |
| Platform | Worker CPU p95 | TBD | TBD | TBD | TBD |

## Comparison rules

- Run benchmarks from the same machine/network when possible.
- Use the same Chrome version and Lighthouse version.
- Run current production and vinext production close together in time.
- Prefer medians over single-run values.
- Keep mobile and desktop results separate.
- Compare cold-cache and warm-cache behavior separately.
- Do not compare local dev server performance to deployed production performance.
- Use the same exact Lighthouse CLI invocation for both baselines. The current baseline used `pnpm dlx lighthouse`, desktop preset for desktop, `--preset=perf` for mobile, and `--chrome-flags="--headless=new --no-sandbox"`.

## Current-run snags to avoid

- The file is currently named `BENCHMARL_PLAN.md` (typo preserved). If renaming to `BENCHMARK_PLAN.md`, update any references in prompts/scripts first.
- The remote bundle script invocation in older notes included `pnpm benchmark:remote-bundle -- ...`; use `pnpm run benchmark:remote-bundle ...` instead.
- Chrome DevTools MCP was not available in the local agent environment, so pagination trace/a11y snapshot steps were skipped for the baseline. If you want direct pagination traces for vinext, configure Chrome DevTools MCP before running both baselines again; otherwise keep using Lighthouse-only metrics for a fair comparison.
- Cloudflare dashboard metrics and `wrangler tail` were not captured for the current baseline. Either capture them for both current and vinext in a fresh paired run, or leave platform metrics out of the comparison table.
- Keep `/beans/85` stable. If that record changes or disappears after migration, update both current and vinext runs to use the same existing bean detail URL.
- The current baseline has a notable bean detail mobile issue: median LCP ~4.34s and CLS ~0.222. Treat this as an existing baseline issue, not automatically a migration regression.
- Store every run under a timestamped directory if running multiple attempts, or move/clear `benchmark-results/next-prod` before rerunning to avoid mixing artifacts.

## Success criteria for migration

vinext should be considered a performance win if most of these hold:

- Client JS for home and bean detail pages is smaller.
- LCP is equal or better on both mobile and desktop.
- CLS remains ≤ 0.1 and does not regress during pagination.
- TBT and long-task count are equal or lower.
- API TTFB/total latency does not regress materially.
- Worker CPU/wall time does not regress materially.
- No new accessibility or SEO issues appear in Lighthouse.

## Follow-up automation ideas

- Add a `benchmark:prod` script that runs remote bundle, Lighthouse, and API latency into a timestamped folder.
- Add a small RUM endpoint using `web-vitals` to collect LCP, INP, and CLS from real users during the migration window.
- Add CI budget checks for JS KiB and Lighthouse regressions once the vinext version is deployed.
