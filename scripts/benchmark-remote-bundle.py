#!/usr/bin/env python3

import argparse
import json
import os
import re
import ssl
import tempfile
import urllib.parse
import urllib.error
import urllib.request
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download page scripts and report bundle sizes."
    )
    parser.add_argument(
        "--url",
        action="append",
        dest="urls",
        help=(
            "Page URL to benchmark. Provide multiple --url flags for multi-page runs. "
            "If omitted, defaults to https://thecoffeecluster.com/"
        ),
    )
    parser.add_argument(
        "--out-dir",
        default="",
        help="Optional output directory. If omitted, a temp directory is used.",
    )
    return parser.parse_args()


def to_kib(byte_count: int) -> float:
    return round(byte_count / 1024, 2)


def slug_from_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.strip("/") or "home"
    slug = re.sub(r"[^a-zA-Z0-9._-]", "_", path)
    if parsed.query:
        query = re.sub(r"[^a-zA-Z0-9._-]", "_", parsed.query)
        slug = f"{slug}__{query}"
    return slug


def fetch_page_html(url: str, ssl_context: ssl.SSLContext, headers: dict[str, str]) -> tuple[bytes, str]:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ssl_context, timeout=45) as response:
            html_bytes = response.read()
            final_url = response.geturl()
            return html_bytes, final_url
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, ssl.SSLError):
            insecure_context = ssl._create_unverified_context()  # noqa: SLF001
            with urllib.request.urlopen(req, context=insecure_context, timeout=45) as response:
                html_bytes = response.read()
                final_url = response.geturl()
                return html_bytes, final_url
        raise


def fetch_asset(url: str, ssl_context: ssl.SSLContext, headers: dict[str, str]) -> bytes:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ssl_context, timeout=45) as response:
            return response.read()
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, ssl.SSLError):
            insecure_context = ssl._create_unverified_context()  # noqa: SLF001
            with urllib.request.urlopen(req, context=insecure_context, timeout=45) as response:
                return response.read()
        raise


def extract_script_srcs(html: str) -> list[str]:
    script_srcs = re.findall(
        r"<script[^>]+src=[\"']([^\"']+)[\"']", html, flags=re.IGNORECASE
    )
    unique_srcs = []
    seen = set()
    for src in script_srcs:
        if src in seen:
            continue
        seen.add(src)
        unique_srcs.append(src)
    return unique_srcs


def main() -> int:
    args = parse_args()
    targets = args.urls or ["https://thecoffeecluster.com/"]

    output_root = Path(args.out_dir) if args.out_dir else Path(
        tempfile.mkdtemp(prefix="bundle-benchmark-")
    )
    output_root.mkdir(parents=True, exist_ok=True)

    pages_path = output_root / "pages"
    pages_path.mkdir(parents=True, exist_ok=True)
    scripts_path = output_root / "scripts"
    scripts_path.mkdir(parents=True, exist_ok=True)

    ssl_context = ssl.create_default_context()
    request_headers = {"User-Agent": "bundle-benchmark/1.0"}

    page_reports = []
    all_script_urls: list[str] = []
    script_url_seen = set()

    for target in targets:
        try:
            html_bytes, final_url = fetch_page_html(target, ssl_context, request_headers)
        except urllib.error.URLError as exc:
            print(f"Failed to fetch {target}: {exc}")
            return 1

        page_slug = slug_from_url(final_url)
        page_dir = pages_path / page_slug
        page_dir.mkdir(parents=True, exist_ok=True)
        html_path = page_dir / "index.html"
        html_path.write_bytes(html_bytes)
        html = html_bytes.decode("utf-8", errors="ignore")

        page_script_srcs = extract_script_srcs(html)
        page_script_urls = [urllib.parse.urljoin(final_url, src) for src in page_script_srcs]
        for script_url in page_script_urls:
            if script_url in script_url_seen:
                continue
            script_url_seen.add(script_url)
            all_script_urls.append(script_url)

        page_reports.append(
            {
                "target": target,
                "final_url": final_url,
                "page_slug": page_slug,
                "html_file": str(html_path),
                "html_bytes": len(html_bytes),
                "html_kib": to_kib(len(html_bytes)),
                "script_count": len(page_script_srcs),
                "script_srcs": page_script_srcs,
                "script_urls": page_script_urls,
            }
        )

    script_results = []
    url_to_bytes: dict[str, int] = {}
    for index, script_url in enumerate(all_script_urls, start=1):
        parsed = urllib.parse.urlparse(script_url)
        ext = os.path.splitext(parsed.path)[1] or ".js"
        file_name = f"{index:02d}{ext}"
        file_path = scripts_path / file_name

        status = "ok"
        error = ""
        file_bytes = 0

        try:
            content = fetch_asset(script_url, ssl_context, request_headers)
            file_path.write_bytes(content)
            file_bytes = file_path.stat().st_size
        except Exception as exc:  # noqa: BLE001
            status = "error"
            error = str(exc)

        url_to_bytes[script_url] = file_bytes
        script_results.append(
            {
                "index": index,
                "url": script_url,
                "file": str(file_path),
                "bytes": file_bytes,
                "kib": to_kib(file_bytes),
                "status": status,
                "error": error,
            }
        )

    ok_results = [item for item in script_results if item["status"] == "ok"]

    for page in page_reports:
        page_total = sum(url_to_bytes.get(url, 0) for url in page["script_urls"])
        page["total_script_bytes"] = page_total
        page["total_script_kib"] = to_kib(page_total)

    report = {
        "targets": targets,
        "output_dir": str(output_root),
        "page_count": len(page_reports),
        "pages": page_reports,
        "unique_script_count": len(all_script_urls),
        "downloaded_ok": len(ok_results),
        "downloaded_failed": len(script_results) - len(ok_results),
        "total_unique_script_bytes": sum(item["bytes"] for item in ok_results),
        "total_unique_script_kib": to_kib(sum(item["bytes"] for item in ok_results)),
        "total_page_script_bytes": sum(page["total_script_bytes"] for page in page_reports),
        "total_page_script_kib": to_kib(sum(page["total_script_bytes"] for page in page_reports)),
        "largest_script": max(ok_results, key=lambda item: item["bytes"]) if ok_results else None,
        "results": sorted(script_results, key=lambda item: item["bytes"], reverse=True),
    }

    report_path = output_root / "report.json"
    report_path.write_text(json.dumps(report, indent=2))

    print("Benchmark complete")
    print(f"Targets: {len(targets)}")
    print(f"Output directory: {output_root}")
    print(f"Unique scripts found: {report['unique_script_count']}")
    print(f"Scripts downloaded: {report['downloaded_ok']} (failed: {report['downloaded_failed']})")
    print(
        "Total unique script bytes: "
        f"{report['total_unique_script_bytes']} ({report['total_unique_script_kib']} KiB)"
    )
    print(
        "Total page script bytes (with per-page overlap): "
        f"{report['total_page_script_bytes']} ({report['total_page_script_kib']} KiB)"
    )
    print(f"Report: {report_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
