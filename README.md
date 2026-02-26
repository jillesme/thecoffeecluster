# thecoffeecluster.com

A sample application using Next.js, PlanetScale Postgres and Cloudflare Hyperdrive . 

## Benchmark remote JS bundles

Use this to capture script sizes from the deployed site before/after upgrades.

```bash
# Home page only
pnpm benchmark:remote-bundle

# Multiple pages (includes dynamic page example)
pnpm benchmark:remote-bundle -- --url https://thecoffeecluster.com/ --url https://thecoffeecluster.com/beans/85

# Optional fixed output directory
pnpm benchmark:remote-bundle -- --url https://thecoffeecluster.com/ --out-dir /tmp/thecoffeecluster-benchmark
```

The script writes a `report.json` with per-page totals and deduplicated script totals.

## YouTube

Watch the video here [<img src="https://img.youtube.com/vi/Xps8IAlZ5a8/0.jpg">](https://youtu.be/Xps8IAlZ5a8 "Globally Fast Applications with Cloudflare Hyperdrive and PlanetScale
")

