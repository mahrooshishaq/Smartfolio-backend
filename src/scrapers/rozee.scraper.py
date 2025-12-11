import time
import random
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def normalize_rozee_url(url):
    """Convert any rozee.gpt.ai URL to www.rozee.pk"""
    if url:
        return url.replace("rozee.gpt.ai", "www.rozee.pk")
    return url

# ---------------------------
# SELENIUM CONFIG
# ---------------------------
chrome_options = Options()
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_argument("--disable-infobars")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument(
    "user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
)

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=chrome_options
)

# ---------------------------
# ALL CITIES WITH CODES
# ---------------------------
# Add city codes here: city_name: fc_code
city_codes = {
    "lahore": 1185,
   # "karachi": 1184,
    #"islamabad": 1180,
    # "rawalpindi": 1190,
    # "faisalabad" : 1181,
    # "gujranwala" : 1182,
    # "gujrat": 2112,
    # "hyderabad": 1183,
    # " jhelum: : 2141,"
    # "multan": 1187,
    # add other cities below
}

base_url = "https://www.rozee.pk/job/jsearch/q/all/fc/{}/page/{}"

all_jobs = []

# ---------------------------
# SCRAPE FUNCTION
# ---------------------------
def scrape_page(city, page):
    try:
        url = base_url.format(city, page)
        print(f"Scraping {city} page {page}: {url}")

        driver.get(url)
        # Random delay to avoid detection
        time.sleep(random.uniform(3, 6))

        job_cards = driver.find_elements(By.CSS_SELECTOR, "div.job")
        if not job_cards:
            print("No jobs found.")
            return False

        for job in job_cards:

            # Job title
            try:
                title_elem = job.find_elements(By.CSS_SELECTOR, "h3.s-18 bdi")
                title = title_elem[0].text.strip() if title_elem else "N/A"
            except:
                title = "N/A"

            # Job link
            try:
                link_elem = job.find_elements(By.CSS_SELECTOR, "h3.s-18 a")
                link = normalize_rozee_url(link_elem[0].get_attribute("href")) if link_elem else "N/A"
            except:
                link = "N/A"

            # Location
            try:
                cname_div = job.find_elements(By.CSS_SELECTOR, "div.cname")
                if cname_div:
                    links = cname_div[0].find_elements(By.CSS_SELECTOR, "a.display-inline")
                    location = links[1].text.strip() if len(links) > 1 else "N/A"
                else:
                    location = "N/A"
            except:
                location = "N/A"

            all_jobs.append({
                "city": city,
                "title": title,
                "link": link,
                "location": location
            })

        return True

    except Exception as e:
        print("Page error:", e)
        return False

# ---------------------------
# RUN SCRAPER
# ---------------------------
for city in city_codes:  # using your city_codes dict
    max_pages = 5  # you can adjust or make dynamic per city
    for page in range(1, max_pages + 1):
        ok = scrape_page(city, page)
        if not ok:
            break
        # Random delay between pages to mimic human browsing
        time.sleep(random.uniform(5, 12))

driver.quit()

# ---------------------------
# SAVE CSV + EXCEL
# ---------------------------
df = pd.DataFrame(all_jobs)
df.to_csv("rozee_jobs.csv", index=False)
df.to_excel("rozee_jobs.xlsx", index=False)

print("\nDone. Jobs scraped:", len(df))
print("Saved as rozee_jobs.csv and rozee_jobs.xlsx")
