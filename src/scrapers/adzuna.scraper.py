import os
import requests
import pandas as pd
import argparse
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

APP_ID  = os.getenv("ADZUNA_APP_ID")
APP_KEY = os.getenv("ADZUNA_APP_KEY")

BULK_COUNTRIES = {
    "us": "United States", "gb": "United Kingdom", "au": "Australia",
    "ca": "Canada", "de": "Germany", "fr": "France", "nl": "Netherlands",
    "sg": "Singapore", "nz": "New Zealand", "in": "India",
    "za": "South Africa", "br": "Brazil", "mx": "Mexico",
    "at": "Austria", "be": "Belgium", "it": "Italy", "es": "Spain",
    "pl": "Poland", "ch": "Switzerland",
}

ON_DEMAND_DEFAULT_COUNTRIES = ["us", "gb", "in"]

BULK_CATEGORIES = [
    "software engineer", "web developer", "data scientist",
    "machine learning engineer", "devops engineer", "cybersecurity analyst",
    "cloud engineer", "mobile developer", "frontend developer",
    "backend developer", "full stack developer", "data analyst",
    "database administrator", "AI engineer", "blockchain developer",
    "finance manager", "accountant", "business analyst", "product manager",
    "project manager", "supply chain manager", "operations manager",
    "investment analyst", "financial analyst", "business development",
    "digital marketing", "content marketing", "seo specialist",
    "social media manager", "sales manager", "account manager",
    "marketing manager", "graphic designer", "ui ux designer",
    "product designer", "human resources manager", "recruiter",
    "talent acquisition", "customer service", "technical support",
    "nurse", "doctor", "teacher", "lecturer",
    "mechanical engineer", "electrical engineer", "civil engineer",
]

BULK_MAX_PAGES = 3
ON_DEMAND_MAX_PAGES = 2
RESULTS_PER_PAGE = 20


def fetch_jobs(query: str, country_code: str, page: int) -> list:
    try:
        url = f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/{page}"
        params = {
            "app_id": APP_ID, "app_key": APP_KEY,
            "results_per_page": RESULTS_PER_PAGE,
            "what": query, "content-type": "application/json",
        }
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 401:
            print(f"  ✗ Invalid credentials")
            return None
        if response.status_code == 400:
            print(f"  ✗ Bad request '{query}' in {country_code}")
            return []
        if response.status_code != 200:
            print(f"  ✗ Error {response.status_code}")
            return []
        results = response.json().get("results", [])
        print(f"    Fetched {len(results)} jobs")
        return results
    except Exception as e:
        print(f"    Error: {e}")
        return []


def parse_job(job: dict, category: str, country_name: str) -> dict:
    salary_min = job.get("salary_min")
    salary_max = job.get("salary_max")
    raw_location = job.get("location", {}).get("display_name", "Not specified")
    location = f"{raw_location}, {country_name}" if raw_location != "Not specified" else country_name
    contract_time = job.get("contract_time", "")
    contract_type = job.get("contract_type", "")
    if contract_time == "full_time":
        job_type = "Full Time"
    elif contract_time == "part_time":
        job_type = "Part Time"
    elif contract_type in ("permanent",):
        job_type = "Full Time"
    elif contract_type == "contract":
        job_type = "Contract"
    else:
        job_type = "Not specified"
    return {
        "title":            job.get("title", "Not specified"),
        "company":          job.get("company", {}).get("display_name", "Not specified"),
        "location":         location,
        "salary_min":       str(round(salary_min)) if salary_min else "Not specified",
        "salary_max":       str(round(salary_max)) if salary_max else "Not specified",
        "job_type":         job_type,
        "experience_level": "Not specified",
        "category":         category,
        "country":          country_name,
        "source":           "adzuna",
        "apply_url":        job.get("redirect_url", "Not specified"),
        "scraped_at":       datetime.now().strftime("%Y-%m-%d"),
    }


def scrape_queries_for_countries(queries: list, countries: dict, max_pages: int) -> list:
    all_jobs = []
    seen_urls = set()
    for country_code, country_name in countries.items():
        print(f"\nCountry: {country_name} ({country_code})")
        for query in queries:
            print(f"  Query: '{query}'")
            for page in range(1, max_pages + 1):
                jobs = fetch_jobs(query, country_code, page)
                if jobs is None:
                    return all_jobs
                if not jobs:
                    break
                new_count = 0
                for job in jobs:
                    parsed = parse_job(job, query, country_name)
                    url_key = parsed["apply_url"]
                    if url_key and url_key not in seen_urls:
                        seen_urls.add(url_key)
                        all_jobs.append(parsed)
                        new_count += 1
                print(f"    Page {page}: +{new_count} | Total: {len(all_jobs)}")
                if new_count == 0:
                    break
    return all_jobs


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
    columns = ["title", "company", "location", "salary_min", "salary_max",
               "job_type", "experience_level", "category", "country",
               "source", "apply_url", "scraped_at"]
    for col in columns:
        if col not in df.columns:
            df[col] = "Not specified"
    df = df[columns]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    df.to_csv(os.path.join(data_dir, f"adzuna_jobs_{timestamp}.csv"), index=False)
    df.to_excel(os.path.join(data_dir, f"adzuna_jobs_{timestamp}.xlsx"), index=False)
    print(f"\n✅ Done! Total jobs saved: {len(df)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Adzuna scraper")
    parser.add_argument("--queries",   type=str, help="Comma-separated search queries")
    parser.add_argument("--output",    type=str, help="Output JSON file for on-demand mode")
    parser.add_argument("--mode",      type=str, default="append")
    parser.add_argument("--countries", type=str, help="Comma-separated country codes e.g. us,gb,in")
    args = parser.parse_args()

    if args.queries and args.output:
        print(f"Adzuna [ON-DEMAND] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        queries = [q.strip() for q in args.queries.split(",") if q.strip()]
        if args.countries:
            country_codes = [c.strip() for c in args.countries.split(",")]
            countries = {c: BULK_COUNTRIES.get(c, c.upper()) for c in country_codes if c in BULK_COUNTRIES}
        else:
            countries = {c: BULK_COUNTRIES[c] for c in ON_DEMAND_DEFAULT_COUNTRIES}
        print(f"Queries: {queries} | Countries: {list(countries.values())}")
        jobs = scrape_queries_for_countries(queries, countries, ON_DEMAND_MAX_PAGES)
        save_to_json(jobs, args.output, args.mode)
    else:
        print(f"Adzuna [BULK] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        jobs = scrape_queries_for_countries(BULK_CATEGORIES, BULK_COUNTRIES, BULK_MAX_PAGES)
        save_to_csv(jobs)

    print(f"Adzuna finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
