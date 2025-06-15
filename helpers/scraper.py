from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import json

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
            # Re-find headers each time to avoid stale element issue
            headers = driver.find_elements(By.CLASS_NAME, "ant-collapse-header")
            header = headers[idx]
            khoi_nganh_name = header.text.strip()

            nganh_list = []

            if idx == 0:
                # Khối đầu tiên đã được mở sẵn
                html = driver.page_source
                soup = BeautifulSoup(html, "html.parser")
                ul_blocks = soup.select("div.ant-collapse-content ul")
            else:
                # Cuộn và click mở khối ngành
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
                    nganh_list.append({
                        "ten_nganh": ten_nganh,
                        "url": href
                    })
                    print(f"✅ {ten_nganh} — {href}")

            all_khoi_nganh.append({
                "khoi_nganh": khoi_nganh_name,
                "nganh": nganh_list
            })

        except Exception as e:
            print(f"❌ Lỗi khi xử lý khối ngành {idx + 1}: {e}")

    total = sum(len(k["nganh"]) for k in all_khoi_nganh)
    print(f"\n📦 Tổng cộng tìm được {total} ngành trong {len(all_khoi_nganh)} khối.")

finally:
    # Ghi ra file JSON
    with open("nganh_dai_hoc_2025.json", "w", encoding="utf-8") as f:
        json.dump(all_khoi_nganh, f, ensure_ascii=False, indent=2)

    print("💾 Đã lưu danh sách ngành vào 'nganh_dai_hoc_2025.json'")
    print("🛑 Đóng trình duyệt...")
    driver.quit()
