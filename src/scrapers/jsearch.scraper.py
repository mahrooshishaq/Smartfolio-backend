import os
import requests
import pandas as pd
import argparse
import json
from datetime import datetime
from dotenv import load_dotenv
import time

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# ---------------------------
# CONFIG
# ---------------------------
API_KEY = os.getenv("JSEARCH_API_KEY")
BASE_URL = "https://jsearch.p.rapidapi.com/search"
HEADERS = {
    "x-rapidapi-host": "jsearch.p.rapidapi.com",
    "x-rapidapi-key": API_KEY,
}

# Bulk mode defaults
BULK_QUERIES = [
    "software engineer in Pakistan",
    "web developer in Pakistan",
    "data scientist in Pakistan",
    "devops in Pakistan",
    "cybersecurity in Pakistan",
    "AI engineer in Pakistan",
    "backend developer in Pakistan",
    "frontend developer in Pakistan",
    "full stack developer in Pakistan",
    "marketing in Pakistan",
    "finance in Pakistan",
    "accounting in Pakistan",
    "business development in Pakistan",
    "sales in Pakistan",
    "human resources in Pakistan",
    "project manager in Pakistan",
    "product manager in Pakistan",
    "graphic designer in Pakistan",
    "UI UX designer in Pakistan",
    "customer service in Pakistan",
    "digital marketing in Pakistan",
    "supply chain in Pakistan",
]

BULK_MAX_PAGES = 8
ON_DEMAND_MAX_PAGES = 2  # fewer pages for on-demand
RESULTS_PER_PAGE = 10
REQUEST_COUNT = 0
MAX_REQUESTS = 200


# ---------------------------
# FETCH JOBS
# ---------------------------
def fetch_jobs(query: str, page: int, country: str = "pk") -> list:
    global REQUEST_COUNT

    if REQUEST_COUNT >= MAX_REQUESTS:
        print(f"  Reached {MAX_REQUESTS} request limit!")
        return None

    try:
        params = {
            "query": query,
            "page": str(page),
            "num_pages": "1",
            "country": country,
            "language": "en",
        }

        response = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=15)
        REQUEST_COUNT += 1

        print(f"  [Request {REQUEST_COUNT}] '{query}' page {page} -> ", end="")

        if response.status_code == 429:
            print("Rate limited! Waiting 10s...")
            time.sleep(10)
            return []

        if response.status_code != 200:
            print(f"Error {response.status_code}")
            return []

        results = response.json().get("data", [])
        print(f"{len(results)} jobs")
        return results

    except Exception as e:
        print(f"Error: {e}")
        return []


# ---------------------------
# PARSE JOB
# ---------------------------
def parse_job(job: dict) -> dict:
    is_remote = job.get("job_is_remote", False)
    employment_type = job.get("job_employment_type", "").lower()

    if is_remote:
        job_type = "Remote"
    elif "full" in employment_type:
        job_type = "Full Time"
    elif "part" in employment_type:
        job_type = "Part Time"
    elif "intern" in employment_type:
        job_type = "Internship"
    elif "contract" in employment_type:
        job_type = "Contract"
    else:
        job_type = "Not specified"

    salary_min = job.get("job_min_salary")
    salary_max = job.get("job_max_salary")

    required_exp = job.get("job_required_experience", {})
    exp_months = required_exp.get("required_experience_in_months", 0) if required_exp else 0
    exp_years = exp_months // 12 if exp_months else 0

    if exp_years == 0:
        experience_level = "Entry level"
    elif exp_years <= 2:
        experience_level = "1-2 Years"
    elif exp_years <= 5:
        experience_level = f"{exp_years} Years"
    else:
        experience_level = f"{exp_years} Years"

    city = job.get("job_city", "")
    country = job.get("job_country", "")
    location = f"{city}, {country}".strip(", ") if city or country else "Not specified"

    return {
        "title":            job.get("job_title", "Not specified"),
        "company":          job.get("employer_name", "Not specified"),
        "location":         location,
        "salary_min":       str(round(salary_min)) if salary_min else "Not specified",
        "salary_max":       str(round(salary_max)) if salary_max else "Not specified",
        "job_type":         job_type,
        "experience_level": experience_level,
        "category":         "Not specified",
        "country":          country or "Not specified",
        "source":           "jsearch",
        "apply_url":        job.get("job_apply_link", "Not specified"),
        "scraped_at":       datetime.now().strftime("%Y-%m-%d"),
    }


# ---------------------------
# CORE SCRAPE FUNCTION
# ---------------------------
def scrape_queries(queries: list, max_pages: int) -> list:
    all_jobs = []
    seen_urls = set()

    for query in queries:
        print(f"\nQuery: '{query}'")
        for page in range(1, max_pages + 1):
            jobs = fetch_jobs(query, page)

            if jobs is None:
                return all_jobs
            if not jobs:
                break

            for job in jobs:
                parsed = parse_job(job)
                url_key = parsed.get("apply_url", "")
                if url_key and url_key not in seen_urls:
                    seen_urls.add(url_key)
                    all_jobs.append(parsed)

            time.sleep(0.5)

    return all_jobs


# ---------------------------
# SAVE — JSON (on-demand) or CSV (bulk)
# ---------------------------
def save_to_json(jobs: list, output_file: str, mode: str = "append"):
    existing = {"jobs": [], "courses": []}

    if mode == "append" and os.path.exists(output_file):
        try:
            with open(output_file, "r") as f:
                existing = json.load(f)
        except Exception:
            pass

    existing_urls = {j.get("apply_url") for j in existing.get("jobs", [])}
    new_jobs = [j for j in jobs if j.get("apply_url") not in existing_urls]
    existing["jobs"].extend(new_jobs)

    with open(output_file, "w") as f:
        json.dump(existing, f, indent=2)

    print(f"  Saved {len(new_jobs)} new jobs to {output_file}")


def save_to_csv(jobs: list):
    if not jobs:
        print("No jobs to save.")
        return

    df = pd.DataFrame(jobs)
    df.drop_duplicates(subset=["apply_url"], inplace=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    csv_file = os.path.join(data_dir, f'jsearch_jobs_{timestamp}.csv')
    excel_file = os.path.join(data_dir, f'jsearch_jobs_{timestamp}.xlsx')

    df.to_csv(csv_file, index=False)
    df.to_excel(excel_file, index=False)

    print(f"\nDone! Total jobs saved: {len(df)}")
    print(f"CSV:   {csv_file}")
    print(f"Excel: {excel_file}")


# ---------------------------
# ENTRY POINT
# ---------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JSearch scraper")
    parser.add_argument("--queries", type=str, help="Comma-separated search queries for on-demand mode")
    parser.add_argument("--output",  type=str, help="Output JSON file path for on-demand mode")
    parser.add_argument("--mode",    type=str, default="append", help="append or overwrite")
    args = parser.parse_args()

    if args.queries and args.output:
        # ON-DEMAND MODE
        print(f"JSearch scraper [ON-DEMAND] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        queries = [q.strip() for q in args.queries.split(",") if q.strip()]
        print(f"Queries: {queries}")
        jobs = scrape_queries(queries, ON_DEMAND_MAX_PAGES)
        save_to_json(jobs, args.output, args.mode)
    else:
        # BULK MODE
        print(f"JSearch scraper [BULK] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Queries: {len(BULK_QUERIES)} | Max pages: {BULK_MAX_PAGES}")
        jobs = scrape_queries(BULK_QUERIES, BULK_MAX_PAGES)
        save_to_csv(jobs)

    print(f"JSearch scraper finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
