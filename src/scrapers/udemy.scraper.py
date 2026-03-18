#!/usr/bin/env python3
"""
Udemy Course Scraper — uses Udemy's public search with proper headers
Usage: python udemy.scraper.py --queries "machine learning,python" --output "/path/user.json" --mode append
"""

import argparse
import json
import os
import time
import requests
from datetime import date

ON_DEMAND_MAX_RESULTS = 15
SOURCE = "udemy"

# Udemy requires these specific headers to not get 403
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.udemy.com/",
    "Origin": "https://www.udemy.com",
    "x-requested-with": "XMLHttpRequest",
    "x-udemy-cache-brand-id": "1",
}

LEVEL_MAP = {
    "beginner level":     "Beginner",
    "intermediate level": "Intermediate",
    "expert level":       "Advanced",
    "all levels":         "All Levels",
}

def fetch_courses(query: str, limit: int = ON_DEMAND_MAX_RESULTS) -> list:
    # Try public search endpoint
    url = "https://www.udemy.com/api-2.0/courses/"
    params = {
        "search":         query,
        "page_size":      limit,
        "ordering":       "relevance",
        "language":       "en",
        "fields[course]": "title,url,price,price_detail,avg_rating,num_reviews,image_480x270,instructional_level_simple,primary_category,headline,content_info,visible_instructors",
    }
    try:
        session = requests.Session()
        # First hit the main page to get cookies
        session.get("https://www.udemy.com/", headers=HEADERS, timeout=10)
        time.sleep(0.5)

        resp = session.get(url, params=params, headers=HEADERS, timeout=15)
        print(f"  Udemy API status: {resp.status_code}")

        if resp.status_code == 200:
            return resp.json().get("results", [])

        # Fallback: try the course search page and parse next data
        search_url = f"https://www.udemy.com/courses/search/?q={requests.utils.quote(query)}&lang=en"
        resp2 = session.get(search_url, headers=HEADERS, timeout=15)
        print(f"  Udemy page status: {resp2.status_code}")

        if resp2.status_code == 200:
            import re
            match = re.search(r'id="ud-data-init"[^>]*>(.*?)</script>', resp2.text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                courses = data.get("initialState", {}).get("searchData", {}).get("courses", {}).get("results", [])
                return courses[:limit]

        return []
    except Exception as e:
        print(f"  ✗ Request failed: {e}")
        return []

def parse_course(raw: dict, query: str) -> dict:
    title = raw.get("title", "Not specified")
    url_path = raw.get("url", "")
    course_url = f"https://www.udemy.com{url_path}" if url_path else "Not specified"

    # Price
    price_detail = raw.get("price_detail", {})
    if isinstance(price_detail, dict):
        price = price_detail.get("price_string", raw.get("price", "Not specified"))
    else:
        price = raw.get("price", "Not specified")
    if price in ["", None, "0", "PKR0.00"]: price = "Free"

    # Rating
    avg_rating = raw.get("avg_rating", 0)
    rating = str(round(float(avg_rating), 1)) if avg_rating else "Not specified"

    # Level
    level_raw = (raw.get("instructional_level_simple") or raw.get("instructional_level") or "").lower()
    level = LEVEL_MAP.get(level_raw, "Not specified")

    # Category
    cat = raw.get("primary_category", {})
    category = cat.get("title", query) if isinstance(cat, dict) else query

    # Instructor
    instructors = raw.get("visible_instructors", [])
    instructor = instructors[0].get("display_name", "Not specified") if instructors and isinstance(instructors[0], dict) else "Not specified"

    # Description
    description = raw.get("headline", "Not specified") or "Not specified"
    if isinstance(description, str) and len(description) > 300:
        description = description[:300] + "..."

    return {
        "title":       title,
        "instructor":  instructor,
        "platform":    "Udemy",
        "category":    category,
        "level":       level,
        "duration":    raw.get("content_info", "Not specified") or "Not specified",
        "price":       price,
        "rating":      rating,
        "language":    "English",
        "description": description,
        "course_url":  course_url,
        "thumbnail":   raw.get("image_480x270", "Not specified"),
        "scraped_at":  str(date.today()),
        "source":      SOURCE,
    }

def scrape_queries(queries: list) -> list:
    all_courses = []
    seen_urls = set()

    for query in queries:
        print(f"\n[Udemy] Searching: '{query}'")
        raw_courses = fetch_courses(query)
        print(f"  → Found {len(raw_courses)} results")

        for raw in raw_courses:
            course = parse_course(raw, query)
            url = course["course_url"]
            if url not in seen_urls and url != "Not specified":
                seen_urls.add(url)
                all_courses.append(course)

        time.sleep(1.5)

    return all_courses

def save_to_json(courses: list, output_path: str, mode: str):
    existing = {"jobs": [], "courses": []}
    if mode == "append" and os.path.exists(output_path):
        try:
            with open(output_path, "r") as f:
                existing = json.load(f)
        except:
            pass

    seen_urls = {c.get("course_url") for c in existing.get("courses", [])}
    new_courses = [c for c in courses if c.get("course_url") not in seen_urls]
    existing["courses"].extend(new_courses)

    with open(output_path, "w") as f:
        json.dump(existing, f, indent=2)

    print(f"\n✓ Saved {len(new_courses)} new Udemy courses → {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--queries", type=str, required=True)
    parser.add_argument("--output",  type=str, required=True)
    parser.add_argument("--mode",    type=str, default="append", choices=["append", "overwrite"])
    args = parser.parse_args()

    queries = [q.strip() for q in args.queries.split(",") if q.strip()]
    print(f"[Udemy Scraper] Queries: {queries}")
    courses = scrape_queries(queries)
    print(f"\n[Udemy] Total unique courses: {len(courses)}")
    save_to_json(courses, args.output, args.mode)
