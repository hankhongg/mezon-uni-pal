import dotenv from "dotenv";
import fs from "fs";
import { MezonClient } from "mezon-sdk";
import callGeminiAPI from "./helpers/apis/gemini_api.js";
import runPythonScraper from "./helpers/school-crawler/run_crawler.js";
import runFoodSuggester from "./helpers/apis/run_food_suggester.js";

dotenv.config();

const majorsData = JSON.parse(
    fs.readFileSync("json/nganh_dai_hoc_2025.json", "utf-8")
);
const availableFunctions = JSON.parse(
    fs.readFileSync("json/available_functions.json", "utf-8")
);

async function main() {
    const client = new MezonClient(process.env.APPLICATION_TOKEN);
    await client.login();

    const userSessions = new Map(); // userId => session object

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
        };

        if (content === "uni!help") {
            session.seenHelp = true;
            session.uniHelp = true;

            const help = availableFunctions
                .map(
                    (item, index) =>
                        `${index + 1}. ${item.tinh_nang} - ${item.mo_ta}`
                )
                .join("\n");
            await message.reply({
                t: `💁🏻‍♀️ Hello, welcome to UniPal!\n\n${help}\n\n📩 Gửi số (1, 2, 3...) để trải nghiệm các tính năng tương ứng.`,
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
                    const major = majorsData
                        .map(
                            (item, index) =>
                                `${index + 1}. ${
                                    item.khoi_nganh.split("\n")[0]
                                }`
                        )
                        .join("\n");

                    session.uniMajor = true;
                    session.selected = majorsData;

                    await message.reply({
                        t: `📚 Danh sách khối ngành:\n${major}\n\n📩 Gửi số (1, 2, 3...) để xem các ngành trong khối.\n\n*Lưu ý* Bấm \"uni!\" để dừng xem các ngành`,
                    });

                    userSessions.set(userId, session);
                    return;
                }
                if (selected.tinh_nang === "Tư vấn khối ngành") {
                    session.uniConsult = true;
                    session.selected = null; // reset selected

                    await message.reply({
                        t: `💬 Bạn có thể gửi nhu cầu của mình để được tư vấn các ngành học phù hợp.\n\n*Lưu ý* Bấm \"uni!\" để dừng tư vấn
            `,
                    });

                    userSessions.set(userId, session);

                    return;
                }
                if (selected.tinh_nang === "Gợi ý món ăn quanh bạn") {
                    await message.reply({
                        t: `📍 Vui lòng nhập địa điểm để gợi ý các quán ăn phù hợp, ví dụ:\n\nuni!food Đại học Bách Khoa`,
                    });
                    return;
                }
            }
        }

        // function -> consultation
        if (
            session.uniConsult &&
            content.trim() !== "" &&
            session.seenHelp &&
            event.username !== "UniPal"
        ) {
            //console.log("Full event shape:", JSON.stringify(event, null, 2));

            //console.log("user id:", userId);
            //console.log("Consulting for:", content);
            session.uniConsult = false; // reset consultation

            userSessions.set(userId, session);
            const response = await callGeminiAPI(content);

            if (response) {
                const formattedResponse = response
                    .split("\n")
                    .map((line, index) => `${index + 1}. ${line}`)
                    .join("\n");
                await message.reply({
                    t: `📚 Dưới đây là các ngành học phù hợp với nguyện vọng của bạn:\n\n${formattedResponse}\n\n📩 Gửi số (1, 2, 3...) để xem các trường học cho ngành này.\n\n*Lưu ý* Bấm \"uni!\" để dừng lại.`,
                });
                session.selected = response; // save selected majors
                session.uniConsultSchool = true; // set to true for next step
                userSessions.set(userId, session);
                return;
            }
            await message.reply({
                t: "❌ Không tìm thấy ngành học phù hợp với nguyện vọng của bạn. Vui lòng thử lại với nguyện vọng khác.",
            });
            return;
        }

        // consultation -> school
        if (
            /^\d+$/.test(content) &&
            session.uniConsultSchool &&
            content.trim() !== "" &&
            event.username !== "UniPal"
        ) {
            session.uniConsultSchool = false; // reset consultation
            userSessions.set(userId, session);

            //console.log("selected majors:", session.selected);
            const allMajors = majorsData.flatMap((group) => group.nganh);
            //console.log("all majors:", allMajors);

            const index = parseInt(content) - 1;
            if (index >= 0 && index < session.selected.length) {
                const selected = session.selected.split("\n")[index]; // from user's number
                const rawSchoolList = allMajors
                    .filter((nganh) => nganh.ten_nganh === selected)
                    .flatMap((nganh) => nganh.truong);

                const uniqueSchoolList = dedupeBy(
                    rawSchoolList,
                    (t) => t.ten_truong
                );

                const schoolList = uniqueSchoolList
                    .map((truong, i) => `${i + 1}. ${truong.ten_truong}`)
                    .join("\n");

                session.uniConsultSchool = false; // reset consultation
                session.uniConsultSchoolMark = true; // set to true for next step
                session.selected = allMajors
                    .filter((nganh) => nganh.ten_nganh === selected)
                    .flatMap((nganh) => nganh.truong); // save selected majors
                session.uniSubMajorLink = allMajors
                    .filter((nganh) => nganh.ten_nganh === selected)
                    .map((nganh) => nganh.url); // save links for submajors
                userSessions.set(userId, session);

                await message.reply({
                    t: `🏫 Ngành \"${selected}\" có các trường sau:\n\n${schoolList}\n\n📩 Gửi số (1, 2, 3...) để xem các phương thức xét tuyển / điểm chuẩn / ... trong các ngành của trường này.\n\n*Lưu ý* Bấm \"uni!\" để dừng.\n\n❗Sau khi bấm vui lòng đợi trong giây lát!`,
                });

                userSessions.set(userId, session);
                return;
            } else {
                await message.reply({
                    t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có.",
                });
            }
        }

        // school -> mark
        if (
            /^\d+$/.test(content) &&
            session.uniConsultSchoolMark &&
            session.selected
        ) {
            const index = parseInt(content) - 1;
            if (index >= 0 && index < session.selected.length) {
                const selected = session.selected[index];

                console.log("selected school:", selected);
                console.log(
                    "selected submajor link:",
                    session.uniSubMajorLink[0]
                );

                session.uniConsultSchoolMark = false; // reset consultation
                //session.selected = schoolList; // save selected schools
                //runPythonScraper(session.uniSubMajorLink[0], selected.ten_truong)
                runPythonScraper(
                    session.uniSubMajorLink[0],
                    selected.ten_truong
                ).then(async (data) => {
                    const reply = formatScrapedData(data);
                    await message.reply({ t: reply });
                });

                // await message.reply({
                //   t: `🏫 Ngành \"${selected.ten_nganh}\" có các trường sau:\n${schoolList}`
                // });

                userSessions.set(userId, session);
                return;
            } else {
                await message.reply({
                    t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có.",
                });
            }
        }

        // major -> submajor
        if (/^\d+$/.test(content) && session.uniMajor && session.selected) {
            const index = parseInt(content) - 1;
            if (index >= 0 && index < session.selected.length) {
                const selected = session.selected[index];
                //console.log("selected:", selected);
                const nganhList = selected.nganh
                    .map(
                        (nganh, i) =>
                            `${i + 1}. ${nganh.ten_nganh} - [Chi tiết](${
                                nganh.url
                            })`
                    )
                    .join("\n");

                session.uniMajor = false;
                session.uniSubMajor = true;
                session.selected = selected.nganh;

                await message.reply({
                    t: `📂 \"${selected.khoi_nganh.split("\n")[0]}\" có ${
                        selected.nganh.length
                    } ngành:\n${nganhList}`,
                });

                userSessions.set(userId, session);
                return;
            } else {
                await message.reply({
                    t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có.",
                });
            }
        }

        // submajor -> school
        if (
            /^\d+$/.test(content) &&
            session.uniSubMajor &&
            Array.isArray(session.selected)
        ) {
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
                    t: `🏫 Ngành \"${selectedSubMajor.ten_nganh}\" có các trường sau:\n${schoolList}`,
                });

                userSessions.set(userId, session);
                return;
            } else {
                await message.reply({
                    t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có.",
                });
            }
        }

        // school -> detail
        if (
            /^\d+$/.test(content) &&
            session.uniSchool &&
            Array.isArray(session.selected)
        ) {
            const index = parseInt(content) - 1;
            if (index >= 0 && index < session.selected.length) {
                const selectedSchool = session.selected[index];
                const ptxt = selectedSchool.ptxt
                    .map(
                        (item, index) =>
                            `${index + 1}. ${item.code} (${item.desc})`
                    )
                    .join("\n");

                const details = `🏫 Trường: ${selectedSchool.ten_truong}\n Các Phương thức Xét tuyển hiện có:\n${ptxt}`;

                await message.reply({ t: details });

                session.uniSchool = false;
                session.selected = null; // reset selected

                userSessions.set(userId, session);
                return;
            } else {
                await message.reply({
                    t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có.",
                });
            }
        }

        // quit
        if (content === "uni!") {
            if (!session.uniHelp && !session.uniMajor && !session.uniSubMajor) {
                await message.reply({
                    t: "⚠️ Bạn chưa bắt đầu xem các ngành. Gửi lại uni!help để xem các tính năng hiện có.",
                });
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

            await message.reply({
                t: "👋 Đã dừng mọi hoạt động. Gửi lại uni!help để bắt đầu lại.",
            });
            userSessions.set(userId, session);
            return;
        }

        if (content.startsWith("uni!food")) {
            const location = content.replace("uni!food", "").trim();
            if (!location) {
                await message.reply({
                    t: "❌ Vui lòng cung cấp địa điểm, ví dụ: `uni!food Đại học Bách Khoa`",
                });
                return;
            }
            try {
                await message.reply({
                    t: "📍 Đang tìm gợi ý quán ăn...",
                });
                const result = await runFoodSuggester(location);
                await message.reply({ t: result });
            } catch (error) {
                console.error("Error in food suggester:", error);
                await message.reply({
                    t: "❌ Có lỗi xảy ra khi gợi ý quán ăn. Vui lòng thử lại sau.",
                });
            }
            return;
        }
    });
}

main()
    .then(() => console.log("🤖 Bot started"))
    .catch((err) => console.error(err));

function formatScrapedData(data) {
    return data
        .map((section) => {
            const title = `📚 **${section.title}**`;

            const rows = section.rows
                .map((row) => {
                    return Object.entries(row)
                        .map(([key, value]) => {
                            if (!value || value.trim() === "") {
                                if (key.toLowerCase().includes("ghi chú"))
                                    return `- ${key}: Không có`;
                                return `- ${key}: Đang cập nhật`;
                            }
                            return `- ${key}: ${value}`;
                        })
                        .join("\n");
                })
                .join("\n\n");

            return `${title}\n${rows}`;
        })
        .join("\n\n──────────────\n\n");
}

function dedupeBy(arr, keyFn) {
    const seen = new Set();
    return arr.filter((item) => {
        const key = keyFn(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
