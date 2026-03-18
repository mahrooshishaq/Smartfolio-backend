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
API_KEY = os.getenv("YOUTUBE_API_KEY")
BASE_URL = "https://www.googleapis.com/youtube/v3/search"

BULK_QUERIES = [
    "python programming full course", "web development full course",
    "data science full course", "machine learning full course",
    "javascript full course", "react full course", "flutter full course",
    "cybersecurity full course", "cloud computing full course",
    "artificial intelligence full course", "accounting full course",
    "finance full course", "digital marketing full course",
    "business management full course", "entrepreneurship full course",
    "stock market full course", "project management full course",
    "supply chain management full course", "graphic design full course",
    "UI UX design full course", "video editing full course",
    "photography full course", "english speaking full course",
    "IELTS preparation full course", "public speaking full course",
    "content writing full course", "nutrition full course",
    "mental health full course", "mathematics full course",
    "physics full course", "chemistry full course", "biology full course",
    "economics full course", "psychology full course", "history full course",
    "leadership full course", "human resources full course",
    "sales training full course", "customer service full course",
    "data analysis full course", "excel full course",
]

MAX_RESULTS_PER_QUERY = 10


def get_category(query: str) -> str:
    q = query.lower()
    if any(w in q for w in ["python", "javascript", "react", "flutter", "web", "data science",
                              "machine learning", "ai", "artificial", "cloud", "cybersecurity",
                              "programming", "development", "software", "excel", "data analysis"]):
        return "Technology"
    elif any(w in q for w in ["accounting", "finance", "stock", "business", "entrepreneurship",
                               "marketing", "project", "supply chain", "management"]):
        return "Business & Finance"
    elif any(w in q for w in ["graphic", "ui", "ux", "design", "video editing", "photography",
                               "illustration", "creative"]):
        return "Design & Creative"
    elif any(w in q for w in ["english", "ielts", "speaking", "writing", "language", "communication"]):
        return "Language & Communication"
    elif any(w in q for w in ["nutrition", "health", "yoga", "mental", "fitness"]):
        return "Health & Lifestyle"
    elif any(w in q for w in ["math", "physics", "chemistry", "biology", "economics",
                               "psychology", "history", "academic"]):
        return "Academic"
    elif any(w in q for w in ["leadership", "human resources", "sales", "customer service", "professional"]):
        return "Professional Skills"
    return "General"


def fetch_courses(query: str) -> list:
    try:
        params = {
            "part": "snippet",
            "q": query,
            "type": "playlist",
            "key": API_KEY,
            "maxResults": MAX_RESULTS_PER_QUERY,
            "relevanceLanguage": "en",
            "order": "relevance",
        }
        response = requests.get(BASE_URL, params=params, timeout=10)
        if response.status_code == 403:
            print(f"  API quota exceeded!")
            return None
        if response.status_code != 200:
            print(f"  API error {response.status_code}")
            return []
        items = response.json().get("items", [])
        print(f"  Fetched {len(items)} courses for '{query}'")
        return items
    except Exception as e:
        print(f"  Error: {e}")
        return []


def parse_course(item: dict, query: str) -> dict:
    snippet = item.get("snippet", {})
    playlist_id = item.get("id", {}).get("playlistId", "")
    return {
        "title":       snippet.get("title", "Not specified"),
        "instructor":  snippet.get("channelTitle", "Not specified"),
        "platform":    "YouTube",
        "category":    get_category(query),
        "level":       "Not specified",
        "duration":    "Not specified",
        "price":       "Free",
        "rating":      "Not specified",
        "language":    "English",
        "description": snippet.get("description", "")[:200],
        "course_url":  f"https://www.youtube.com/playlist?list={playlist_id}" if playlist_id else "Not specified",
        "thumbnail":   snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
        "scraped_at":  datetime.now().strftime("%Y-%m-%d"),
        "source":      "youtube",
    }


def scrape_queries(queries: list) -> list:
    all_courses = []
    seen_urls = set()

    for i, query in enumerate(queries, 1):
        print(f"\n[{i}/{len(queries)}] Fetching: {query.upper()}")
        courses = fetch_courses(query)
        if courses is None:
            print("Quota exceeded, stopping.")
            break
        if not courses:
            continue
        for item in courses:
            parsed = parse_course(item, query)
            url_key = parsed.get("course_url", "")
            if url_key and url_key not in seen_urls:
                seen_urls.add(url_key)
                all_courses.append(parsed)
        time.sleep(0.3)

    return all_courses


# ---------------------------
# SAVE — JSON (on-demand) or CSV (bulk)
# ---------------------------
def save_to_json(courses: list, output_file: str, mode: str = "append"):
    existing = {"jobs": [], "courses": []}
    if mode == "append" and os.path.exists(output_file):
        try:
            with open(output_file, "r") as f:
                existing = json.load(f)
        except Exception:
            pass
    existing_urls = {c.get("course_url") for c in existing.get("courses", [])}
    new_courses = [c for c in courses if c.get("course_url") not in existing_urls]
    existing["courses"].extend(new_courses)
    with open(output_file, "w") as f:
        json.dump(existing, f, indent=2)
    print(f"  Saved {len(new_courses)} new courses to {output_file}")


def save_to_csv(courses: list):
    if not courses:
        print("No courses to save.")
        return
    df = pd.DataFrame(courses)
    df.drop_duplicates(subset=["course_url"], inplace=True)
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    df.to_csv(os.path.join(data_dir, "youtube_courses.csv"), index=False)
    df.to_excel(os.path.join(data_dir, "youtube_courses.xlsx"), index=False)
    print(f"\nDone! Total courses saved: {len(df)}")
    print("\nCourses by category:")
    print(df["category"].value_counts().to_string())


# ---------------------------
# ENTRY POINT
# ---------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YouTube courses scraper")
    parser.add_argument("--queries", type=str, help="Comma-separated queries for on-demand mode")
    parser.add_argument("--output",  type=str, help="Output JSON file for on-demand mode")
    parser.add_argument("--mode",    type=str, default="append")
    args = parser.parse_args()

    if args.queries and args.output:
        print(f"YouTube scraper [ON-DEMAND] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        queries = [q.strip() for q in args.queries.split(",") if q.strip()]
        print(f"Queries: {queries}")
        courses = scrape_queries(queries)
        save_to_json(courses, args.output, args.mode)
    else:
        print(f"YouTube scraper [BULK] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Queries: {len(BULK_QUERIES)} | Max results per query: {MAX_RESULTS_PER_QUERY}")
        courses = scrape_queries(BULK_QUERIES)
        save_to_csv(courses)

    print(f"YouTube scraper finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
