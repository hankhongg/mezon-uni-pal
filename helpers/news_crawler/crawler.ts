import request from "request";
import puppeteer from "puppeteer";

class Crawler {
  constructor() {}

  async getTrangNhat() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
  
    try {
      await page.goto("https://vnexpress.net", {
        waitUntil: "domcontentloaded", 
      });
  
      await page.waitForSelector("h3.title-news a");
  
      const trangNhat = await page.$$eval("h3.title-news a", (links) =>
        links.map((el) => ({
          title: el.textContent ? el.textContent.trim() : "",
          url: el.href || ""
        })).slice(0, 15)
      );
  
      console.log(trangNhat);
      await browser.close();
      return trangNhat;
    } catch (err) {
      await browser.close();
      throw err;
    }
  }

  async getNewsContent(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
  
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded", 
      });
  
      // Wait for the main content elements
      await page.waitForSelector(".title-detail, .fck_detail");
  
      const newsData = await page.evaluate(() => {
        // Get the title
        const titleElement = document.querySelector(".title-detail");
        const title = titleElement ? (titleElement.textContent ? titleElement.textContent.trim() : "") : "";
        
        // Get the article content
        const articleElement = document.querySelector(".fck_detail");
        let content = "";
        
        if (articleElement) {
          // Get all paragraphs within the article
          const paragraphs = articleElement.querySelectorAll("p.Normal");
          content = Array.from(paragraphs)
            .map(p => p.textContent ? p.textContent.trim() : "")
            .filter(text => text.length > 0)
            .join("\n\n");
        }
        
        return { title, content };
      });
  
      await browser.close();
      return newsData;
    } catch (err) {
      await browser.close();
      throw err;
    }
  }

  async getCategories() {
    try {
      console.log("Launching browser...");
      const browser = await puppeteer.launch({ headless: true }); 
      const page = await browser.newPage();

      console.log("Navigating to VnExpress homepage...");
      await page.goto("https://vnexpress.net", {
        waitUntil: "domcontentloaded", 
        timeout: 30000, 
      });

      // Wait for the navigation section to load
      await page.waitForSelector("#wrap-main-nav ul.parent.scroll", { timeout: 10000 });

      console.log("Extracting categories data...");
      const categories = await page.evaluate(() => {
        console.log("Querying category elements...");
        const navSection = document.querySelector("#wrap-main-nav ul.parent.scroll");
        if (!navSection) {
          console.log("Navigation section not found");
          return [];
        }

        const categoryItems = Array.from(navSection.querySelectorAll("li"));
        console.log(`Found ${categoryItems.length} category items`);

        return categoryItems.map((li) => {
          const mainLink = li.querySelector("a") as HTMLAnchorElement;
          
          // Skip items without main links or that are just icons (like home)
          if (!mainLink || !mainLink.textContent?.trim()) {
            return null;
          }

          const subLinks = Array.from(li.querySelectorAll("ul.sub li a")) as HTMLAnchorElement[];
          
          const categoryName = mainLink.textContent.trim();
          console.log(`Processing category: ${categoryName}`);
          
          // Convert relative URLs to absolute URLs
          const mainUrl = mainLink.href || "";
          const absoluteMainUrl = mainUrl.startsWith('http') ? mainUrl : `https://vnexpress.net${mainUrl}`;

          return {
            name: categoryName,
            url: absoluteMainUrl,
            className: li.className.trim(),
            dataId: li.getAttribute("data-id") || "",
            subCategories: subLinks.map(subLink => {
              const subUrl = subLink.href || "";
              const absoluteSubUrl = subUrl.startsWith('http') ? subUrl : `https://vnexpress.net${subUrl}`;
              
              return {
                name: subLink.textContent ? subLink.textContent.trim() : "",
                url: absoluteSubUrl
              };
            }).filter(sub => sub.name && sub.url)
          };
        }).filter(cat => {
          if (!cat || !cat.name || !cat.url || cat.name === "") return false;
          
          // Filter out unwanted categories
          const unwantedCategories = ["Video", "Podcasts", "Tất cả"];
          return !unwantedCategories.includes(cat.name);
        });
      });

      console.log("Closing browser...");
      await browser.close();

      console.log(`Successfully extracted ${categories.length} categories`);
      return categories;
    } catch (err) {
      console.log("Error while extracting categories:", err);
      throw err;
    }
  }

  async getCategoryNews(categoryUrl) {
    console.log(`Starting getCategoryNews for URL: ${categoryUrl}`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
  
    try {
      console.log("Navigating to category page...");
      await page.goto(categoryUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
  
      console.log("Waiting for news articles to load...");
      await page.waitForSelector("h3.title-news a", { timeout: 15000 });
  
      console.log("Extracting news articles...");
      const categoryNews = await page.$$eval("h3.title-news a", (links) =>
        links.map((el) => ({
          title: el.textContent ? el.textContent.trim() : "",
          url: el.href || ""
        })).filter(news => news.title && news.url).slice(0, 15)
      );
  
      console.log(`Successfully extracted ${categoryNews.length} news articles`);
      await browser.close();
      return categoryNews;
    } catch (err) {
      console.error(`Error in getCategoryNews for ${categoryUrl}:`, err.message);
      try {
        await browser.close();
      } catch (closeErr) {
        console.error("Error closing browser:", closeErr.message);
      }
      
      // Return empty array instead of throwing to prevent crashes
      console.log("Returning empty array due to error");
      return [];
    }
  }
}

export default Crawler;