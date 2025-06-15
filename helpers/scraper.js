const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // headless: true nếu không cần thấy trình duyệt
  const page = await browser.newPage();

  try {
    await page.goto("https://diemthi.tuyensinh247.com/nganh-dao-tao.html", {
      waitUntil: "networkidle2",
    });

    // Wait for the main table to be present
    await page.waitForSelector("#tblData");

    // Extract table rows
    const majors = await page.$$eval("#tblData tbody tr", (rows) =>
      rows.map((row) => {
        const cells = row.querySelectorAll("td");
        return {
          stt: cells[0]?.innerText.trim(),
          tenNganh: cells[1]?.innerText.trim(),
          maNganh: cells[2]?.innerText.trim(),
          toHopXetTuyen: cells[3]?.innerText.trim(),
        };
      })
    );

    console.log("✅ Đã lấy được", majors.length, "ngành");
    console.log(majors.slice(0, 5)); // In thử 5 ngành đầu

    await browser.close();
  } catch (error) {
    console.error("❌ Lỗi khi crawl:", error);
    await browser.close();
  }
})();
