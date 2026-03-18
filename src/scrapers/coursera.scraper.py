#!/usr/bin/env python3
"""
Coursera Course Scraper — uses Coursera's GraphQL API (same one their website uses)
Usage: python coursera.scraper.py --queries "machine learning,python" --output "/path/user.json" --mode append
"""

import argparse
import json
import os
import time
import requests
from datetime import date

ON_DEMAND_MAX_RESULTS = 10
SOURCE = "coursera"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/json",
    "Origin": "https://www.coursera.org",
    "Referer": "https://www.coursera.org/search?query=python",
}

DIFFICULTY_MAP = {
    "BEGINNER":     "Beginner",
    "INTERMEDIATE": "Intermediate",
    "ADVANCED":     "Advanced",
    "MIXED":        "All Levels",
}

def fetch_courses(query: str, limit: int = ON_DEMAND_MAX_RESULTS) -> list:
    # Use Coursera's search API that the website itself uses
    url = "https://www.coursera.org/search"
    params = {
        "query": query,
        "index": "prod_all_launched_products_term_optimization",
        "entityTypeDescription": "Courses",
        "limit": limit,
    }
    # Try the search page API endpoint
    api_url = f"https://www.coursera.org/api/courses.v1"
    params2 = {
        "q": "search",
        "query": query,
        "limit": limit,
        "fields": "name,slug,photoUrl,difficultyLevel,avgRating,numRatings,isCourseFree,primaryLanguages,partners,description",
        "includes": "partnerIds",
        "showHidden": "false",
    }
    try:
        resp = requests.get(api_url, params=params2, headers=HEADERS, timeout=15)
        print(f"  Coursera API status: {resp.status_code}")
        if resp.status_code == 200:
            return resp.json().get("elements", [])

        # Fallback: try catalogue API
        cat_url = "https://api.coursera.org/api/courses.v1"
        resp2 = requests.get(cat_url, params=params2, headers=HEADERS, timeout=15)
        print(f"  Coursera catalogue status: {resp2.status_code}")
        if resp2.status_code == 200:
            return resp2.json().get("elements", [])

        return []
    except Exception as e:
        print(f"  ✗ Request failed: {e}")
        return []

def fetch_courses_opensyllabus(query: str, limit: int = ON_DEMAND_MAX_RESULTS) -> list:
    """Fallback: use Coursera's public catalogue endpoint"""
    try:
        url = f"https://www.coursera.org/courses?query={requests.utils.quote(query)}"
        resp = requests.get(url, headers=HEADERS, timeout=15)
        print(f"  Coursera page status: {resp.status_code}")
        # Parse JSON-LD or next data from HTML
        import re
        match = re.search(r'window\.__NEXT_DATA__\s*=\s*(\{.*?\});\s*</script>', resp.text, re.DOTALL)
        if match:
            data = json.loads(match.group(1))
            courses = []
            # Navigate the Next.js data structure
            props = data.get("props", {}).get("pageProps", {})
            results = props.get("searchResults", props.get("results", []))
            return results[:limit]
        return []
    except Exception as e:
        print(f"  ✗ Fallback failed: {e}")
        return []

def parse_course(raw: dict, query: str) -> dict:
    slug = raw.get("slug", raw.get("id", ""))
    name = raw.get("name", raw.get("title", "Not specified"))
    partners = raw.get("partners", [])
    instructor = partners[0].get("name", "Not specified") if partners and isinstance(partners[0], dict) else "Not specified"
    difficulty = DIFFICULTY_MAP.get(raw.get("difficultyLevel", ""), "Not specified")
    avg_rating = raw.get("avgRating", raw.get("avg_rating", "Not specified"))
    is_free = raw.get("isCourseFree", False)
    price = "Free" if is_free else "Paid"
    description = raw.get("description", "Not specified")
    if isinstance(description, str) and len(description) > 300:
        description = description[:300] + "..."

    return {
        "title":       name,
        "instructor":  instructor,
        "platform":    "Coursera",
        "category":    query,
        "level":       difficulty,
        "duration":    "Not specified",
        "price":       price,
        "rating":      str(round(float(avg_rating), 1)) if avg_rating and avg_rating != "Not specified" else "Not specified",
        "language":    "English",
        "description": description,
        "course_url":  f"https://www.coursera.org/learn/{slug}" if slug else "Not specified",
        "thumbnail":   raw.get("photoUrl", raw.get("image_url", "Not specified")),
        "scraped_at":  str(date.today()),
        "source":      SOURCE,
    }

def scrape_queries(queries: list) -> list:
    all_courses = []
    seen_urls = set()

    for query in queries:
        print(f"\n[Coursera] Searching: '{query}'")
        raw_courses = fetch_courses(query)
        if not raw_courses:
            print(f"  API failed, trying page scrape...")
            raw_courses = fetch_courses_opensyllabus(query)
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

    print(f"\n✓ Saved {len(new_courses)} new Coursera courses → {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--queries", type=str, required=True)
    parser.add_argument("--output",  type=str, required=True)
    parser.add_argument("--mode",    type=str, default="append", choices=["append", "overwrite"])
    args = parser.parse_args()

    queries = [q.strip() for q in args.queries.split(",") if q.strip()]
    print(f"[Coursera Scraper] Queries: {queries}")
    courses = scrape_queries(queries)
    print(f"\n[Coursera] Total unique courses: {len(courses)}")
    save_to_json(courses, args.output, args.mode)
