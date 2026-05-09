import asyncio
import json
import os
import argparse
import pandas as pd
from datetime import datetime
from playwright.async_api import async_playwright
from groq import Groq
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# ---------------------------
# CONFIG
# ---------------------------
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Default city codes for bulk mode
city_codes = {
    "lahore":     1185,
    "karachi":    1184,
    "islamabad":  1180,
    "rawalpindi": 1190,
    "faisalabad": 1181,
}

MAX_PAGES_PER_QUERY = 2
base_url = "https://www.rozee.pk/job/jsearch/q/{}/page/{}"
base_url_city = "https://www.rozee.pk/job/jsearch/q/all/fc/{}/page/{}"


# ---------------------------
# AI EXTRACTION
# ---------------------------
async def ai_extract_jobs(html: str, city: str) -> list:
    for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
        try:
            prompt = f"""Extract all job listings from this HTML from rozee.pk.
Return ONLY a valid JSON array, no explanation, no markdown, no backticks.
Each object must have these exact fields:
- title: job title
- company: company name
- location: job location
- salary: salary if mentioned, else "Not specified"
- job_type: full time / part time / internship / contract / remote / hybrid if mentioned, else "Not specified"
- experience: experience required if mentioned, else "Not specified"
- apply_url: the direct link to the job from the href attribute (must start with https://www.rozee.pk, prepend it if the href is relative like /job/...)
- city: "{city}"
- scraped_at: "{datetime.now().strftime('%Y-%m-%d')}"

HTML:
{html[:4000]}"""

            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )

            raw = response.choices[0].message.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            jobs = json.loads(raw)
            print(f"  AI extracted {len(jobs)} jobs (model: {model})")
            return jobs

        except json.JSONDecodeError as e:
            print(f"  AI returned invalid JSON ({model}): {e}")
            return []
        except Exception as e:
            if "413" in str(e) or "rate_limit" in str(e).lower():
                print(f"  Rate limit on {model}, trying fallback...")
                continue
            print(f"  AI extraction error ({model}): {e}")
            return []

    return []


# ---------------------------
# NORMALIZE
# ---------------------------
def normalize_jobs(jobs: list) -> list:
    normalized = []
    for job in jobs:
        # Fix relative or missing URLs
        apply_url = job.get("apply_url", "Not specified")
        if apply_url and apply_url.startswith("/"):
            apply_url = "https://www.rozee.pk" + apply_url
        elif apply_url and not apply_url.startswith("http"):
            apply_url = "https://www.rozee.pk/" + apply_url

        normalized.append({
            "title":            job.get("title", "Not specified"),
            "company":          job.get("company", "Not specified"),
            "location":         job.get("location") or job.get("city", "Not specified"),
            "salary_min":       job.get("salary", "Not specified"),
            "salary_max":       "Not specified",
            "job_type":         job.get("job_type", "Not specified"),
            "experience_level": job.get("experience", "Not specified"),
            "category":         "Not specified",
            "country":          "Pakistan",
            "source":           "rozee.pk",
            "apply_url":        apply_url,
            "scraped_at":       job.get("scraped_at", datetime.now().strftime("%Y-%m-%d")),
        })
    return normalized


# ---------------------------
# SCRAPER — ON-DEMAND MODE (query-based)
# ---------------------------
async def scrape_by_queries(queries: list[str]) -> list:
    all_jobs = []
    seen_urls = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="en-US",
        )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = await context.new_page()

        for query in queries:
            print(f"\nQuery: '{query}'")
            for page_num in range(1, MAX_PAGES_PER_QUERY + 1):
                url = base_url.format(query.replace(" ", "+"), page_num)
                print(f"  Page {page_num}: {url}")

                try:
                    await page.goto(url, timeout=30000, wait_until="networkidle")
                    await page.wait_for_timeout(8000)

                    html = await page.content()

                    if "no jobs found" in html.lower() or "0 jobs" in html.lower():
                        break

                    # Extract job data directly from the DOM (rozee loads dynamically)
                    jobs = await page.evaluate("""() => {
                        const results = [];
                        const listings = document.querySelectorAll('.jlist');
                        listings.forEach(el => {
                            const titleEl = el.querySelector('h3, .jtitle, h4 a');
                            const companyEl = el.querySelector('.cname, .jbody a[href*="/company/"], .subtitle');
                            const locationEl = el.querySelector('.loc, .jloc, [class*="location"]');
                            const linkEl = el.querySelector('a[href*="/job/"]');
                            const salaryEl = el.querySelector('.sal, [class*="salary"]');
                            const typeEl = el.querySelector('.jtype, [class*="type"]');

                            const title = titleEl ? titleEl.textContent.trim() : '';
                            if (!title) return;

                            let href = linkEl ? (linkEl.href || linkEl.getAttribute('href') || '') : '';
                            if (href && !href.startsWith('http')) href = 'https://www.rozee.pk' + href;

                            results.push({
                                title: title,
                                company: companyEl ? companyEl.textContent.trim() : 'Not specified',
                                location: locationEl ? locationEl.textContent.trim() : 'Pakistan',
                                apply_url: href || '',
                                salary: salaryEl ? salaryEl.textContent.trim() : 'Not specified',
                                job_type: typeEl ? typeEl.textContent.trim() : 'Not specified',
                            });
                        });

                        // Fallback: also check h3 elements with job links
                        if (results.length === 0) {
                            document.querySelectorAll('a[href*="/job/"]').forEach(a => {
                                const text = a.textContent.trim();
                                if (text.length > 5 && text.length < 100) {
                                    let href = a.href || a.getAttribute('href') || '';
                                    if (href && !href.startsWith('http')) href = 'https://www.rozee.pk' + href;
                                    results.push({
                                        title: text,
                                        company: 'Not specified',
                                        location: 'Pakistan',
                                        apply_url: href,
                                        salary: 'Not specified',
                                        job_type: 'Not specified',
                                    });
                                }
                            });
                        }

                        return results;
                    }""")
                    print(f"  Extracted {len(jobs)} jobs from DOM")

                    # Add metadata
                    for job in jobs:
                        job["city"] = query
                        job["scraped_at"] = datetime.now().strftime('%Y-%m-%d')
                        job["experience"] = "Not specified"

                    normalized = normalize_jobs(jobs)

                    new_count = 0
                    for job in normalized:
                        key = job.get("apply_url", "")
                        if key and key not in seen_urls:
                            seen_urls.add(key)
                            all_jobs.append(job)
                            new_count += 1

                    print(f"  +{new_count} new | Total: {len(all_jobs)}")

                    if new_count == 0:
                        break

                    await page.wait_for_timeout(3000)

                except Exception as e:
                    print(f"  Error: {e}")
                    break

        await browser.close()

    return all_jobs


# ---------------------------
# SCRAPER — BULK MODE (city-based, original behavior)
# ---------------------------
async def scrape_bulk() -> list:
    all_jobs = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
            locale="en-US",
        )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = await context.new_page()

        for city, code in city_codes.items():
            print(f"\nScraping city: {city.upper()}")
            for page_num in range(1, 6):
                url = base_url_city.format(code, page_num)
                print(f"  Page {page_num}: {url}")

                try:
                    await page.goto(url, timeout=30000)
                    await page.wait_for_timeout(8000)
                    html = await page.content()

                    if "no jobs found" in html.lower() or "0 jobs" in html.lower():
                        break

                    # Extract real job links directly
                    job_links = await page.evaluate("""() => {
                        const links = [];
                        document.querySelectorAll('a[href*="/job/"]').forEach(a => {
                            const href = a.href || a.getAttribute('href') || '';
                            if (href && !links.includes(href) && href.includes('/job/')) {
                                links.push(href.startsWith('http') ? href : 'https://www.rozee.pk' + href);
                            }
                        });
                        return [...new Set(links)].slice(0, 20);
                    }""")

                    job_section = await page.query_selector_all(
                        'div.job, article, [class*="job-card"], [class*="jobCard"]'
                    )

                    if job_section:
                        jobs_html = ""
                        for el in job_section[:6]:
                            jobs_html += await el.inner_html()
                            jobs_html += "\n---\n"
                    else:
                        jobs_html = html[:4000]

                    jobs = await ai_extract_jobs(jobs_html, city)

                    # Override AI URLs with real links
                    for i, job in enumerate(jobs):
                        if i < len(job_links):
                            job["apply_url"] = job_links[i]

                    normalized = normalize_jobs(jobs)

                    if not normalized:
                        break

                    all_jobs.extend(normalized)
                    print(f"  Total so far: {len(all_jobs)}")
                    await page.wait_for_timeout(4000)

                except Exception as e:
                    print(f"  Error on page {page_num}: {e}")
                    break

        await browser.close()

    return all_jobs


# ---------------------------
# SAVE — JSON (on-demand) or CSV (bulk)
# ---------------------------
def save_to_json(jobs: list, output_file: str, mode: str = "append"):
    """Save/append jobs to a user-specific JSON file."""
    existing = {"jobs": [], "courses": []}

    if mode == "append" and os.path.exists(output_file):
        try:
            with open(output_file, "r") as f:
                existing = json.load(f)
        except Exception:
            pass

    # Merge and deduplicate
    existing_urls = {j.get("apply_url") for j in existing.get("jobs", [])}
    new_jobs = [j for j in jobs if j.get("apply_url") not in existing_urls]
    existing["jobs"].extend(new_jobs)

    with open(output_file, "w") as f:
        json.dump(existing, f, indent=2)

    print(f"  Saved {len(new_jobs)} new jobs to {output_file}")


def save_to_csv(jobs: list):
    """Save jobs to CSV+Excel in src/data/ for bulk mode."""
    if not jobs:
        print("No jobs to save.")
        return

    df = pd.DataFrame(jobs)
    df.drop_duplicates(subset=["apply_url"], inplace=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    csv_file = os.path.join(data_dir, f'rozee_jobs_{timestamp}.csv')
    excel_file = os.path.join(data_dir, f'rozee_jobs_{timestamp}.xlsx')

    df.to_csv(csv_file, index=False)
    df.to_excel(excel_file, index=False)

    print(f"\nDone! Total jobs saved: {len(df)}")
    print(f"CSV:   {csv_file}")
    print(f"Excel: {excel_file}")


# ---------------------------
# ENTRY POINT
# ---------------------------
async def main():
    parser = argparse.ArgumentParser(description="Rozee.pk scraper")
    parser.add_argument("--queries", type=str, help="Comma-separated search queries for on-demand mode")
    parser.add_argument("--output",  type=str, help="Output JSON file path for on-demand mode")
    parser.add_argument("--mode",    type=str, default="append", help="append or overwrite")
    args = parser.parse_args()

    if args.queries and args.output:
        # ON-DEMAND MODE — targeted queries, save to user JSON
        print(f"Rozee scraper started [ON-DEMAND] at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        queries = [q.strip() for q in args.queries.split(",") if q.strip()]
        print(f"Queries: {queries}")
        jobs = await scrape_by_queries(queries)
        save_to_json(jobs, args.output, args.mode)
    else:
        # BULK MODE — all cities, save to CSV
        print(f"Rozee scraper started [BULK] at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        jobs = await scrape_bulk()
        save_to_csv(jobs)

    print(f"Rozee scraper finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    asyncio.run(main())
