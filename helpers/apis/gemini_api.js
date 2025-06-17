// import { GoogleGenAI } from "@google/genai";

// export default function callGeminiAPI(prompt) {
//   const client = new GoogleGenAI({
//     apiKey: process.env.GOOGLE_API_KEY,
//   });
//     return client.chat.completions.create({
//         model: "gemini-1.5-pro",
//         messages: [
//         {
//             role: "user",
//             content: prompt,
//         },
//         ],
//         maxTokens: 1000,
//         temperature: 0.2,
//     });
// }


import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();


// absolute path to the file
const filePath = path.resolve("json/txt/nganh_hoc_khong_trung.txt");

// read and split into lines
const majorsList = fs.readFileSync(filePath, "utf-8").split("\n").map(line => line.trim()).filter(Boolean);

//console.log(majorsList);


// Exporting async function
export default async function callGeminiAPI(prompt) {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    const chat = model.startChat({
      history: [], 
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.2,
      },
    });

    const result = await chat.sendMessage(`
      Bạn là chuyên gia tư vấn tuyển sinh đại học.

      Dưới đây là danh sách các ngành học đại học ở Việt Nam:

      ---

      ${majorsList.join("\n")}
      ---
      Nguyện vọng của thí sinh: ${prompt}

      Hãy liệt kê TẤT CẢ các ngành học trong danh sách trên phù hợp với nguyện vọng này (mỗi ngành 1 dòng, hãy chắc chắn không dư dòng trống nào), không giải thích thêm, không sửa đổi tên ngành.
      Nếu không ngành nào phù hợp thì trả về: Không phù hợp.`);
    const response = await result.response;
    //console.log("Gemini API Response:", response.text().split("\n").map(line => line.trim()).filter(Boolean));
    return response.text().split("\n").map(line => line.trim()).filter(Boolean).join("\n");
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "Oops, something went wrong.";
  }
}
