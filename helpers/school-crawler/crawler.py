from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup
import time
import requests
import sys
import json

def get_link_diem_truong(url, ten_truong):
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        tables = soup.find_all("table")
        for table in tables:
            for row in table.find_all("tr"):
                cols = row.find_all("td")
                if len(cols) >= 1:
                    truong_a = cols[0].find("a")
                    truong = truong_a.get_text(strip=True) if truong_a else cols[0].get_text(strip=True)
                    if ten_truong == truong and truong_a and truong_a.has_attr("href"):
                        full_url = "https://diemthi.tuyensinh247.com" + truong_a["href"]
                        return full_url
        return None
    except Exception as e:
        error_msg = {"error": f"Lỗi khi lấy link: {str(e)}"}
        sys.stdout.buffer.write(json.dumps(error_msg, ensure_ascii=False).encode('utf-8'))
        sys.exit(1)

def crawl_all_tables_selenium(url):
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--log-level=3")
    service = Service(log_path='nul')  # avoid chromedriver logs in Windows
    driver = webdriver.Chrome(options=options)

    driver.get(url)
    time.sleep(3)
    html = driver.page_source
    driver.quit()

    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")

    result = []
    for idx, table in enumerate(tables):
        rows = table.find_all('tr')
        if not rows:
            continue

        header_row = rows[0]
        headers = [th.get_text(strip=True) for th in header_row.find_all(['td', 'th'])]
        if all(h == "" for h in headers):
            continue  # skip bảng rỗng

        # Get title before the table
        title = None
        prev_h3 = table.find_previous(lambda tag: tag.name == "h3" and "table__title" in tag.get("class", []))
        if prev_h3:
            title = prev_h3.get_text(" ", strip=True)
        if not title:
            title = f"Bảng {idx+1}"

        rows_data = []
        for row in rows[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
            if len(cells) == len(headers):
                rows_data.append(dict(zip(headers, cells)))

        if rows_data:
            result.append({'title': title, 'header': headers, 'rows': rows_data})

    return result

if __name__ == "__main__":
    if len(sys.argv) < 3:
        error_msg = {"error": "Thiếu tham số: cần truyền URL và tên trường"}
        sys.stdout.buffer.write(json.dumps(error_msg, ensure_ascii=False).encode('utf-8'))
        sys.exit(1)

    url = sys.argv[1]
    ten_truong = sys.argv[2]

    link = get_link_diem_truong(url, ten_truong)
    if not link:
        error_msg = {"error": "Không tìm thấy link"}
        sys.stdout.buffer.write(json.dumps(error_msg, ensure_ascii=False).encode('utf-8'))
        sys.exit(1)

    result = crawl_all_tables_selenium(link)
    sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
