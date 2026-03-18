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

BULK_MAX_PAGES = 5
ON_DEMAND_MAX_PAGES = 2
BASE_URL = "https://www.edx.org/search?q={query}&page={page}"

BULK_QUERIES = [
    "python programming", "web development", "data science", "machine learning",
    "javascript", "react", "flutter", "cybersecurity", "cloud computing",
    "artificial intelligence", "sql database", "devops", "blockchain",
    "deep learning", "computer science", "accounting", "finance",
    "digital marketing", "business management", "entrepreneurship",
    "project management", "supply chain", "economics", "mba",
    "graphic design", "ui ux design", "product design", "english writing",
    "communication skills", "public speaking", "biology", "chemistry",
    "physics", "public health", "nutrition", "leadership", "data analysis",
    "statistics", "mathematics", "psychology", "philosophy", "history",
    "architecture", "law", "education",
]


def get_category(query: str) -> str:
    q = query.lower()
    if any(w in q for w in ["python", "javascript", "react", "flutter", "web", "data science",
                              "machine learning", "ai", "artificial", "cloud", "cybersecurity",
                              "programming", "development", "sql", "devops", "blockchain",
                              "deep learning", "computer"]):
        return "Technology"
    elif any(w in q for w in ["accounting", "finance", "stock", "business", "entrepreneurship",
                               "marketing", "project", "supply chain", "economics", "mba"]):
        return "Business & Finance"
    elif any(w in q for w in ["graphic", "ui", "ux", "design", "creative", "product design"]):
        return "Design & Creative"
    elif any(w in q for w in ["english", "writing", "speaking", "language", "communication"]):
        return "Language & Communication"
    elif any(w in q for w in ["biology", "chemistry", "physics", "health", "nutrition", "science"]):
        return "Health & Science"
    elif any(w in q for w in ["leadership", "data analysis", "statistics", "mathematics",
                               "psychology", "philosophy", "history", "architecture", "law", "education"]):
        return "Academic & Professional"
    return "General"


# ---------------------------
# AI EXTRACTION
# ---------------------------
async def ai_extract_courses(html: str, query: str) -> list:
    category = get_category(query)
    today = datetime.now().strftime("%Y-%m-%d")

    for model in [
        os.getenv("GROQ_MODEL_SCRAPER", "llama-3.1-8b-instant"),
        "llama-3.3-70b-versatile"
    ]:
        try:
            prompt = f"""Extract all course listings from this HTML from edx.org.
Return ONLY a valid JSON array. No explanation, no markdown, no backticks.
Each object must have these exact fields:
- title: course title
- instructor: instructor or professor name, else "Not specified"
- platform: always "edX"
- category: "{category}"
- level: Beginner / Intermediate / Advanced / All Levels if mentioned, else "Not specified"
- duration: course duration if mentioned (e.g. "6 weeks", "3 months"), else "Not specified"
- price: price if shown (e.g. "Free", "$199"), else "Not specified"
- rating: rating if shown (e.g. "4.5"), else "Not specified"
- language: language of course, default "English"
- description: short 1-2 sentence description of the course
- course_url: full URL to the course (must start with https://www.edx.org)
- thumbnail: thumbnail image URL if available, else ""
- scraped_at: "{today}"
- source: "edx"

HTML:
{html[:4000]}"""

            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )

            raw = response.choices[0].message.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            courses = json.loads(raw)
            print(f"    AI extracted {len(courses)} courses (model: {model})")
            return courses

        except json.JSONDecodeError as e:
            print(f"    AI invalid JSON ({model}): {e}")
            return []
        except Exception as e:
            if "413" in str(e) or "rate_limit" in str(e).lower():
                print(f"    Rate limit on {model}, trying fallback...")
                continue
            print(f"    AI error ({model}): {e}")
            return []

    return []


# ---------------------------
# CORE SCRAPER
# ---------------------------
async def scrape_queries(queries: list, max_pages: int) -> list:
    all_courses = []
    seen_urls = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = await context.new_page()

        for qi, query in enumerate(queries, 1):
            print(f"\n[{qi}/{len(queries)}] Query: '{query.upper()}'")

            for page_num in range(1, max_pages + 1):
                url = BASE_URL.format(query=query.replace(" ", "+"), page=page_num)
                print(f"  Page {page_num}: {url}")

                try:
                    await page.goto(url, timeout=60_000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(5000)

                    for _ in range(4):
                        await page.evaluate("window.scrollBy(0, window.innerHeight)")
                        await asyncio.sleep(0.8)
                    await page.wait_for_timeout(2000)

                    html = await page.content()

                    if any(phrase in html.lower() for phrase in ["no results found", "0 results", "no courses found"]):
                        print(f"    No results on page {page_num}, stopping.")
                        break

                    card_els = await page.query_selector_all(
                        "[data-testid='course-card'], article[class*='course'], "
                        "[class*='course-card'], [class*='CourseCard'], [class*='product-card']"
                    )

                    if card_els:
                        cards_html = ""
                        for el in card_els[:6]:
                            cards_html += await el.inner_text()
                            cards_html += "\n---\n"
                        print(f"    Found {len(card_els)} card elements")
                    else:
                        cards_html = html[:4000]
                        print(f"    No cards found, using HTML slice")

                    courses = await ai_extract_courses(cards_html, query)

                    new_count = 0
                    for c in courses:
                        url_key = c.get("course_url", "").strip()
                        if url_key and url_key not in seen_urls:
                            seen_urls.add(url_key)
                            all_courses.append(c)
                            new_count += 1

                    print(f"    +{new_count} new | Total: {len(all_courses)}")
                    if new_count == 0:
                        break

                    await page.wait_for_timeout(3000)

                except Exception as e:
                    print(f"    Error on page {page_num}: {e}")
                    break

        await browser.close()

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
    columns = ["title", "instructor", "platform", "category", "level",
               "duration", "price", "rating", "language", "description",
               "course_url", "thumbnail", "scraped_at", "source"]
    for col in columns:
        if col not in df.columns:
            df[col] = "Not specified"
    df = df[columns]
    df.drop_duplicates(subset=["course_url"], inplace=True)
    df = df[df["title"].notna() & (df["title"] != "") & (df["title"] != "Not specified")]

    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    df.to_csv(os.path.join(data_dir, "edx_courses.csv"), index=False)
    df.to_excel(os.path.join(data_dir, "edx_courses.xlsx"), index=False)

    print(f"\n✅ Done! Total courses saved: {len(df)}")
    print("\nCourses by category:")
    print(df["category"].value_counts().to_string())


# ---------------------------
# ENTRY POINT
# ---------------------------
async def main():
    parser = argparse.ArgumentParser(description="edX scraper")
    parser.add_argument("--queries", type=str, help="Comma-separated queries for on-demand mode")
    parser.add_argument("--output",  type=str, help="Output JSON file for on-demand mode")
    parser.add_argument("--mode",    type=str, default="append")
    args = parser.parse_args()

    if args.queries and args.output:
        print(f"edX scraper [ON-DEMAND] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        queries = [q.strip() for q in args.queries.split(",") if q.strip()]
        print(f"Queries: {queries}")
        courses = await scrape_queries(queries, ON_DEMAND_MAX_PAGES)
        save_to_json(courses, args.output, args.mode)
    else:
        print(f"edX scraper [BULK] started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Queries: {len(BULK_QUERIES)} | Max pages: {BULK_MAX_PAGES}")
        courses = await scrape_queries(BULK_QUERIES, BULK_MAX_PAGES)
        save_to_csv(courses)

    print(f"edX scraper finished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    asyncio.run(main())
