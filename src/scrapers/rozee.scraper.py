import time
import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

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
# ALL CITIES
# ---------------------------
cities = [
    "lahore", "karachi", "islamabad", "rawalpindi", "multan", "faisalabad", "bahawalpur",
    "quetta", "peshawar", "hyderabad", "sialkot", "gujranwala", "sukkur", "abbottabad",
    "mirpur", "rahimyar", "dgkhan", "nawabshah", "sheikhupura", "muzaffargarh"
]

base_url = "https://www.rozee.pk/job/jsearch/q/all/jcity/{}/page/{}"

all_jobs = []

# ---------------------------
# SCRAPE FUNCTION
# ---------------------------
def scrape_page(city, page):
    try:
        url = base_url.format(city, page)
        print(f"Scraping {city} page {page}: {url}")

        driver.get(url)
        time.sleep(4)

        job_titles = driver.find_elements(By.CSS_SELECTOR, "h3.s-18")

        if not job_titles:
            print("No jobs found.")
            return False

        for jt in job_titles:

            # title
            try:
                title = jt.find_element(By.CSS_SELECTOR, "a bdi").text.strip()
            except:
                title = "N/A"

            # job link
            try:
                link = jt.find_element(By.TAG_NAME, "a").get_attribute("href")
            except:
                link = "N/A"

            # location
            try:
                cname_div = jt.find_element(By.XPATH, "./following-sibling::div[@class='cname']")
                links = cname_div.find_elements(By.CSS_SELECTOR, "a.display-inline")
                location = links[1].text.strip() if len(links) > 1 else "N/A"
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
for city in cities:
    for page in range(1, 5):  # you can increase this if needed
        ok = scrape_page(city, page)
        if not ok:
            break

driver.quit()

# ---------------------------
# SAVE CSV + EXCEL
# ---------------------------
df = pd.DataFrame(all_jobs)
df.to_csv("rozee_jobs.csv", index=False)
df.to_excel("rozee_jobs.xlsx", index=False)

print("\nDone. Jobs scraped:", len(df))
print("Saved as rozee_jobs.csv and rozee_jobs.xlsx")
