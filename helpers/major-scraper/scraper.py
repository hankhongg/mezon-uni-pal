from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import requests
import time
import json
import re
import os

service = EdgeService(executable_path="../edgedriver_win64/msedgedriver.exe")
driver = webdriver.Edge(service=service)

try:
    driver.get("https://diemthi.tuyensinh247.com/nganh-dao-tao.html")
    print("👉 Đang mở trang ngành đào tạo...")
    time.sleep(3)

    WebDriverWait(driver, 15).until(
        EC.presence_of_all_elements_located((By.CLASS_NAME, "ant-collapse-header"))
    )

    headers = driver.find_elements(By.CLASS_NAME, "ant-collapse-header")
    print(f"🔍 Tìm thấy {len(headers)} khối ngành.")

    all_khoi_nganh = []

    for idx in range(len(headers)):
        print(f"\n🔽 Mở khối ngành {idx + 1}/{len(headers)}...")

        try:
            headers = driver.find_elements(By.CLASS_NAME, "ant-collapse-header")
            header = headers[idx]
            khoi_nganh_name = header.text.strip()

            nganh_list = []

            if idx == 0:
                html = driver.page_source
                soup = BeautifulSoup(html, "html.parser")
                ul_blocks = soup.select("div.ant-collapse-content ul")
            else:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", header)
                WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.CLASS_NAME, "ant-collapse-header")))
                driver.execute_script("arguments[0].click();", header)
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "ant-collapse-content-active"))
                )
                time.sleep(1)
                html = driver.page_source
                soup = BeautifulSoup(html, "html.parser")
                ul_blocks = soup.select("div.ant-collapse-content-active ul")

            for ul in ul_blocks:
                for a in ul.select("a[href^='/nganh-dao-tao/']"):
                    ten_nganh = a.text.strip()
                    href = "https://diemthi.tuyensinh247.com" + a["href"]
                    truong_list = []

                    try:
                        res = requests.get(href, headers={"User-Agent": "Mozilla/5.0"})
                        soup_nganh = BeautifulSoup(res.text, "html.parser")
                        rows = soup_nganh.select("tbody.ant-table-tbody tr")

                        for row in rows:
                            cols = row.find_all("td")
                            raw_methods = cols[2].text.strip()
                            methods = re.findall(r'(ĐT THPT|ĐGNL HCM|ĐGNL HN|ĐGTD BK|Kết Hợp|Ưu Tiên|CCQT)', raw_methods)
                            method_map = {
                                "ĐT THPT": "Điểm thi tốt nghiệp THPT",
                                "ĐGNL HCM": "Đánh giá năng lực ĐHQG HCM",
                                "ĐGNL HN": "Đánh giá năng lực ĐHQG Hà Nội",
                                "ĐGTD BK": "Đánh giá tư duy Bách Khoa",
                                "Kết Hợp": "Xét tuyển kết hợp",
                                "Ưu Tiên": "Xét tuyển thẳng / ưu tiên",
                                "CCQT": "Chứng chỉ quốc tế"
                            }
                            methods_detail = [{"code": m, "desc": method_map.get(m, "")} for m in methods]
                            if len(cols) >= 4:
                                truong_list.append({
                                    "ten_truong": cols[0].text.strip(),
                                    "so_nganh": cols[1].text.strip(),
                                    "ptxt": methods_detail,
                                })

                    except Exception as e:
                        print(f"❌ Không lấy được trường cho ngành: {ten_nganh} — {e}")

                    nganh_list.append({
                        "ten_nganh": ten_nganh,
                        "url": href,
                        "truong": truong_list
                    })

                    print(f"✅ {ten_nganh} — {href} — {len(truong_list)} trường")

            all_khoi_nganh.append({
                "khoi_nganh": khoi_nganh_name,
                "nganh": nganh_list,
            
            })

        except Exception as e:
            print(f"❌ Lỗi khi xử lý khối ngành {idx + 1}: {e}")

    total_nganh = sum(len(k["nganh"]) for k in all_khoi_nganh)
    print(f"\n📦 Tổng cộng tìm được {total_nganh} ngành trong {len(all_khoi_nganh)} khối.")

finally:
    # Get the parent directory (i.e., the directory that contains both 'helpers' and 'json')
    parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))

    # Build the full path to the desired output file in the 'json' folder
    output_path = os.path.join(parent_dir, "json", "nganh_dai_hoc_2025.json")

    # Optional: ensure the json folder exists (in case it was deleted)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Write the JSON file
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_khoi_nganh, f, ensure_ascii=False, indent=2)

    print(f"💾 Đã lưu file vào: {output_path}")
    print("🛑 Đóng trình duyệt...")
    driver.quit()
