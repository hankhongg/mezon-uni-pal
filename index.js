import dotenv from "dotenv";
import fs from "fs";
import { MezonClient } from "mezon-sdk";
import callGeminiAPI from "./helpers/apis/gemini_api.js"; 
import runPythonScraper from "./helpers/school-crawler/run_crawler.js";
import Crawler from "./helpers/news_crawler/crawler.ts";
import { beautifier, categoryBeautifier } from "./helpers/news_crawler/beautifier.ts";

dotenv.config();

const majorsData = JSON.parse(fs.readFileSync("json/nganh_dai_hoc_2025.json", "utf-8"));
const availableFunctions = JSON.parse(fs.readFileSync("json/available_functions.json", "utf-8"));

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);
  await client.login();

  const userSessions = new Map(); // userId => session object
  const newsCrawler = new Crawler(); // Initialize the news crawler

  // client.on(MezonEventSocket.MESSAGE_CREATE, (message) => {
  //   console.log(
  //     `New message from ${message.author?.username} in channel ${message.channelId}: ${message.content}`
  //   );

  //   // Basic auto-reply bot
  //   if (
  //     message.author?.id !== client.user?.id &&
  //     message.content.toLowerCase() === "!hello"
  //   ) {
  //     message.reply({ content: `Hello there, ${message.author?.username}!` });
  //   }
  // });

  client.onChannelMessage(async (event) => {
    const content = event?.content?.t?.trim();
    if (!content) return;

    const userId = event.sender_id;
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);

    const session = userSessions.get(userId) || {
      seenHelp: false,
      uniHelp: false,
      uniMajor: false,
      uniSubMajor: false,
      uniSubMajorLink: null,
      uniSchool: false,
      uniConsult: false,
      uniConsultSchool: false,
      uniConsultSchoolMark: false,
      selected: null,
      newsMode: false,
      newsData: null,
      categoryMode: false,
      categoryData: null,
      categoryNewsMode: false,
      categoryNewsData: null
    };


    if (content === "uni!help") {
      session.seenHelp = true;
      session.uniHelp = true;

      const help = availableFunctions.map((item, index) => `${index + 1}. ${item.tinh_nang} - ${item.mo_ta}`).join("\n");
      await message.reply({
        t: `💁🏻‍♀️ Hello, welcome to UniPal!\n\n${help}\n\n📩 Gửi số (1, 2, 3...) để trải nghiệm các tính năng tương ứng.`
      });

      userSessions.set(userId, session);
      return;
    }

    // function -> major
    if (/^\d+$/.test(content) && session.uniHelp) {
      session.uniHelp = false;

      const index = parseInt(content) - 1;
      if (index >= 0 && index < availableFunctions.length) {
        const selected = availableFunctions[index];
        if (selected.tinh_nang === "Xem danh sách các khối ngành") {
          const major = majorsData.map((item, index) => `${index + 1}. ${item.khoi_nganh.split("\n")[0]}`).join("\n");

          session.uniMajor = true;
          session.selected = majorsData;

          await message.reply({
            t: `📚 Danh sách khối ngành:\n${major}\n\n📩 Gửi số (1, 2, 3...) để xem các ngành trong khối.\n\n*Lưu ý* Bấm \"uni!\" để dừng xem các ngành`
          });

          userSessions.set(userId, session);
          return;
        }
        if (selected.tinh_nang === "Tư vấn khối ngành") {
          session.uniConsult = true;
          session.selected = null; // reset selected

          await message.reply({
            t: `💬 Bạn có thể gửi nhu cầu của mình để được tư vấn các ngành học phù hợp.\n\n*Lưu ý* Bấm \"uni!\" để dừng tư vấn
            `
          });

          userSessions.set(userId, session);

          return;
        }
        if (selected.tinh_nang === "Xem tin tức trang nhất") {
          session.newsMode = true;
          session.selected = null; // reset selected

          await message.reply({
            t: `📰 Đang tải tin tức mới nhất từ VnExpress...\n\n*Vui lòng đợi trong giây lát*`
          });

          try {
            const newsData = await newsCrawler.getTrangNhat();
            session.newsData = newsData;
            const formattedNews = beautifier(newsData);
            
            await message.reply({
              t: formattedNews
            });
          } catch (error) {
            await message.reply({
              t: `❌ Không thể tải tin tức. Vui lòng thử lại sau.\nLỗi: ${error.message}`
            });
          }

          session.newsMode = true;
          userSessions.set(userId, session);
          return;
        }
        if (selected.tinh_nang === "Duyệt tin tức theo chuyên mục") {
          session.categoryMode = true;
          session.selected = null; // reset selected

          await message.reply({
            t: `📂 Đang tải danh sách chuyên mục...\n\n*Vui lòng đợi trong giây lát*`
          });

          try {
            const categoryData = await newsCrawler.getCategories();
            session.categoryData = categoryData;
            const formattedCategories = categoryBeautifier(categoryData);
            
            await message.reply({
              t: formattedCategories
            });
          } catch (error) {
            await message.reply({
              t: `❌ Không thể tải danh sách chuyên mục. Vui lòng thử lại sau.\nLỗi: ${error.message}`
            });
          }

          userSessions.set(userId, session);
          return;
        }
      }
    }


    // function -> consultation
    if(session.uniConsult &&  content.trim() !== "" && session.seenHelp && event.username !== "UniPal") {
      //console.log("Full event shape:", JSON.stringify(event, null, 2));

      //console.log("user id:", userId);
      //console.log("Consulting for:", content);
      session.uniConsult = false; // reset consultation

      userSessions.set(userId, session);
      const response = await callGeminiAPI(content);

      if (response) {
        const formattedResponse = response.split("\n").map((line, index) => `${index + 1}. ${line}`).join("\n");
        await message.reply({
          t: `📚 Dưới đây là các ngành học phù hợp với nguyện vọng của bạn:\n\n${formattedResponse}\n\n📩 Gửi số (1, 2, 3...) để xem các trường học cho ngành này.\n\n*Lưu ý* Bấm \"uni!\" để dừng lại.`
        });
        session.selected = response; // save selected majors
        session.uniConsultSchool = true; // set to true for next step
        userSessions.set(userId, session);
        return;
      }
      await message.reply({
        t: "❌ Không tìm thấy ngành học phù hợp với nguyện vọng của bạn. Vui lòng thử lại với nguyện vọng khác."
      });
      return;
    }

    // consultation -> school
    if(/^\d+$/.test(content) && session.uniConsultSchool && content.trim() !== "" && event.username !== "UniPal") {
      session.uniConsultSchool = false; // reset consultation
      userSessions.set(userId, session);

      //console.log("selected majors:", session.selected);
      const allMajors = majorsData.flatMap(group => group.nganh);
      //console.log("all majors:", allMajors);

      const index = parseInt(content) - 1;
      if (index >= 0 && index < session.selected.length) {
        const selected = session.selected.split("\n")[index]; // from user's number
        const rawSchoolList = allMajors
          .filter(nganh => nganh.ten_nganh === selected)
          .flatMap(nganh => nganh.truong);

        const uniqueSchoolList = dedupeBy(rawSchoolList, t => t.ten_truong);

        const schoolList = uniqueSchoolList
          .map((truong, i) => `${i + 1}. ${truong.ten_truong}`)
          .join("\n");
          

        session.uniConsultSchool = false; // reset consultation
        session.uniConsultSchoolMark = true; // set to true for next step
        session.selected = allMajors.filter(nganh => nganh.ten_nganh === selected).flatMap(nganh => nganh.truong); // save selected majors
        session.uniSubMajorLink = allMajors.filter(nganh => nganh.ten_nganh === selected).map(nganh => nganh.url); // save links for submajors
        userSessions.set(userId, session);  
        

        await message.reply({
          t: `🏫 Ngành \"${selected}\" có các trường sau:\n\n${schoolList}\n\n📩 Gửi số (1, 2, 3...) để xem các phương thức xét tuyển / điểm chuẩn / ... trong các ngành của trường này.\n\n*Lưu ý* Bấm \"uni!\" để dừng.\n\n❗Sau khi bấm vui lòng đợi trong giây lát!`
        });

        userSessions.set(userId, session);
        return;
      } else {
        await message.reply({ t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có." });
      }
    }

    // school -> mark
    if(/^\d+$/.test(content) && session.uniConsultSchoolMark && session.selected) {
      const index = parseInt(content) - 1;
      if (index >= 0 && index < session.selected.length) {
        const selected = session.selected[index];

        console.log("selected school:", selected);
        console.log("selected submajor link:", session.uniSubMajorLink[0]);

        session.uniConsultSchoolMark = false; // reset consultation
        //session.selected = schoolList; // save selected schools
        //runPythonScraper(session.uniSubMajorLink[0], selected.ten_truong)
        runPythonScraper(session.uniSubMajorLink[0], selected.ten_truong)
          .then(async data => {
          const reply = formatScrapedData(data);
          await message.reply({ t: reply });
        });

        
        // await message.reply({
        //   t: `🏫 Ngành \"${selected.ten_nganh}\" có các trường sau:\n${schoolList}`
        // });

        userSessions.set(userId, session);
        return;
      } else {
        await message.reply({ t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có." });
      }

    }
    
    // major -> submajor
    if (/^\d+$/.test(content) && session.uniMajor && session.selected) {
      const index = parseInt(content) - 1;
      if (index >= 0 && index < session.selected.length) {
        const selected = session.selected[index];
        //console.log("selected:", selected);
        const nganhList = selected.nganh
          .map((nganh, i) => `${i + 1}. ${nganh.ten_nganh} - [Chi tiết](${nganh.url})`)
          .join("\n");


        session.uniMajor = false;
        session.uniSubMajor = true;
        session.selected = selected.nganh;

        await message.reply({
          t: `📂 \"${selected.khoi_nganh.split("\n")[0]}\" có ${selected.nganh.length} ngành:\n${nganhList}`
        });

        userSessions.set(userId, session);
        return;
      } else {
        await message.reply({ t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có." });
      }
    }

    // submajor -> school
    if (/^\d+$/.test(content) && session.uniSubMajor && Array.isArray(session.selected)) {
      const index = parseInt(content) - 1;
      if (index >= 0 && index < session.selected.length) {
        
        const selectedSubMajor = session.selected[index];
        const schoolList = selectedSubMajor.truong
          .map((truong, i) => `${i + 1}. ${truong.ten_truong}`)
          .join("\n");

        session.uniSubMajor = false;
        session.uniSchool = true;
        session.selected = selectedSubMajor.truong;
        

        await message.reply({
          t: `🏫 Ngành \"${selectedSubMajor.ten_nganh}\" có các trường sau:\n${schoolList}`
        });

        userSessions.set(userId, session);
        return;
      } else {
        await message.reply({ t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có." });
      }
    }

    // school -> detail
    if (/^\d+$/.test(content) && session.uniSchool && Array.isArray(session.selected)) {
      const index = parseInt(content) - 1;
      if (index >= 0 && index < session.selected.length) {
        const selectedSchool = session.selected[index];
        const ptxt = selectedSchool.ptxt.map((item, index) => `${index + 1}. ${item.code} (${item.desc})`).join("\n");

        const details = `🏫 Trường: ${selectedSchool.ten_truong}\n Các Phương thức Xét tuyển hiện có:\n${ptxt}`;

        await message.reply({ t: details });

        session.uniSchool = false;
        session.selected = null; // reset selected

        userSessions.set(userId, session);
        return;
      } else {
        await message.reply({ t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có." });
      }
    }

    // NEWS FUNCTIONALITY - Placed at the end to avoid interference with university logic
    
    // category -> category news (only when in category mode)
    if (session.categoryMode && session.categoryData) {
      // Handle subcategory selection (e.g., "1a", "2b", "3c")
      if (/^\d+[a-z]$/.test(content)) {
        const numberPart = parseInt(content.slice(0, -1)) - 1;
        const letterPart = content.slice(-1).charCodeAt(0) - 97; // Convert 'a' to 0, 'b' to 1, etc.
        
        if (numberPart >= 0 && numberPart < session.categoryData.length) {
          const category = session.categoryData[numberPart];
          if (category.subCategories && letterPart >= 0 && letterPart < category.subCategories.length) {
            const subCategory = category.subCategories[letterPart];
            
            await message.reply({
              t: `📰 Đang tải tin tức từ "${subCategory.name}"...\n\n*Vui lòng đợi trong giây lát*`
            });

            try {
              const categoryNews = await newsCrawler.getCategoryNews(subCategory.url);
              session.categoryNewsData = categoryNews;
              session.categoryMode = false;
              session.categoryNewsMode = true;
              
              const formattedNews = beautifier(categoryNews);
              await message.reply({
                t: `📂 **${subCategory.name}**\n\n${formattedNews}`
              });
            } catch (error) {
              await message.reply({
                t: `❌ Không thể tải tin tức từ chuyên mục này. Vui lòng thử lại sau.\nLỗi: ${error.message}`
              });
            }

            userSessions.set(userId, session);
            return;
          }
        }
        
        await message.reply({ 
          t: "❌ Mã chuyên mục không hợp lệ. Vui lòng chọn từ danh sách." 
        });
        return;
      }
      
      // Handle main category selection (e.g., "1", "2", "3")
      if (/^\d+$/.test(content)) {
        const index = parseInt(content) - 1;
        if (index >= 0 && index < session.categoryData.length) {
          const category = session.categoryData[index];
          
          await message.reply({
            t: `📰 Đang tải tin tức từ "${category.name}"...\n\n*Vui lòng đợi trong giây lát*`
          });

          try {
            const categoryNews = await newsCrawler.getCategoryNews(category.url);
            session.categoryNewsData = categoryNews;
            session.categoryMode = false;
            session.categoryNewsMode = true;
            
            const formattedNews = beautifier(categoryNews);
            await message.reply({
              t: `📂 **${category.name}**\n\n${formattedNews}`
            });
          } catch (error) {
            await message.reply({
              t: `❌ Không thể tải tin tức từ chuyên mục này. Vui lòng thử lại sau.\nLỗi: ${error.message}`
            });
          }

          userSessions.set(userId, session);
          return;
        } else {
          await message.reply({ 
            t: "❌ Số không hợp lệ. Vui lòng chọn từ danh sách chuyên mục." 
          });
          return;
        }
      }
    }

    // news -> article content (only when in news mode)
    if (/^\d+$/.test(content) && session.newsMode && session.newsData) {
      const index = parseInt(content) - 1;
      if (index >= 0 && index < session.newsData.length) {
        const selectedNews = session.newsData[index];
        
        await message.reply({
          t: `📰 Đang tải nội dung tin tức...\n\n*Vui lòng đợi trong giây lát*`
        });

        try {
          const newsContent = await newsCrawler.getNewsContent(selectedNews.url);
          
          if (newsContent.title && newsContent.content) {
            const formattedContent = `📰 **${newsContent.title}**\n\n${newsContent.content}\n\n🔗 Nguồn: ${selectedNews.url}\n📩 Bạn có thể gửi "uni!" để quay lại từ đầu`;
            await message.reply({
              t: formattedContent
            });
          } else {
            await message.reply({
              t: `❌ Không thể tải nội dung tin tức này. Vui lòng thử tin khác.\n\n🔗 Bạn có thể truy cập trực tiếp: ${selectedNews.url}`
            });
          }
        } catch (error) {
          await message.reply({
            t: `❌ Không thể tải nội dung tin tức. Vui lòng thử lại sau.\n\n🔗 Bạn có thể truy cập trực tiếp: ${selectedNews.url}\n\nLỗi: ${error.message}`
          });
        }

        userSessions.set(userId, session);
        return;
      } else {
        await message.reply({ 
          t: "❌ Số không hợp lệ. Vui lòng chọn số từ danh sách tin tức." 
        });
        return;
      }
    }

    // category news -> article content (only when in category news mode)
    if (/^\d+$/.test(content) && session.categoryNewsMode && session.categoryNewsData) {
      const index = parseInt(content) - 1;
      if (index >= 0 && index < session.categoryNewsData.length) {
        const selectedNews = session.categoryNewsData[index];
        
        await message.reply({
          t: `📰 Đang tải nội dung tin tức...\n\n*Vui lòng đợi trong giây lát*`
        });

        try {
          const newsContent = await newsCrawler.getNewsContent(selectedNews.url);
          
          if (newsContent.title && newsContent.content) {
            const formattedContent = `📰 **${newsContent.title}**\n\n${newsContent.content}\n\n🔗 Nguồn: ${selectedNews.url}\n📩 Bạn có thể gửi "uni!" để quay lại từ đầu`;
            await message.reply({
              t: formattedContent
            });
          } else {
            await message.reply({
              t: `❌ Không thể tải nội dung tin tức này. Vui lòng thử tin khác.\n\n🔗 Bạn có thể truy cập trực tiếp: ${selectedNews.url}`
            });
          }
        } catch (error) {
          await message.reply({
            t: `❌ Không thể tải nội dung tin tức. Vui lòng thử lại sau.\n\n🔗 Bạn có thể truy cập trực tiếp: ${selectedNews.url}\n\nLỗi: ${error.message}`
          });
        }

        userSessions.set(userId, session);
        return;
      } else {
        await message.reply({ 
          t: "❌ Số không hợp lệ. Vui lòng chọn số từ danh sách tin tức." 
        });
        return;
      }
    }

    // quit
    if (content === "uni!") {
      if (!session.uniHelp && !session.uniMajor && !session.uniSubMajor && !session.newsMode && !session.categoryMode && !session.categoryNewsMode) {
        await message.reply({ t: "⚠️ Bạn chưa bắt đầu xem các ngành hoặc tin tức. Gửi lại uni!help để xem các tính năng hiện có." });
        return;
      }

      session.uniHelp = false;
      session.uniMajor = false;
      session.uniSubMajor = false;
      session.selected = null;
      session.uniSchool = false;
      session.uniConsult = false;
      session.seenHelp = false;
      session.uniConsultSchool = false;
      session.uniConsultSchoolMark = false;
      session.uniSubMajorLink = null;
      session.newsMode = false;
      session.newsData = null;
      session.categoryMode = false;
      session.categoryData = null;
      session.categoryNewsMode = false;
      session.categoryNewsData = null;

      await message.reply({ t: "👋 Đã dừng mọi hoạt động. Gửi lại uni!help để bắt đầu lại." });
      userSessions.set(userId, session);
      return;
    }
  });
}

main()
  .then(() => console.log("🤖 Bot started"))
  .catch((err) => console.error(err));


function formatScrapedData(data) {
  return data.map(section => {
    const title = `📚 **${section.title}**`;

    const rows = section.rows.map(row => {
      return Object.entries(row)
        .map(([key, value]) => {
          if (!value || value.trim() === "") {
            if (key.toLowerCase().includes("ghi chú")) return `- ${key}: Không có`;
            return `- ${key}: Đang cập nhật`;
          }
          return `- ${key}: ${value}`;
        })
        .join('\n');
    }).join('\n\n');

    return `${title}\n${rows}`;
  }).join('\n\n──────────────\n\n');
}

function dedupeBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}