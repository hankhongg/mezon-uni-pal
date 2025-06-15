const dotenv = require("dotenv");
const fs = require("fs");
const { MezonClient } = require("mezon-sdk");

dotenv.config();

const majorsData = JSON.parse(fs.readFileSync("json/nganh_dai_hoc_2025.json", "utf-8"));
const availableFunctions = JSON.parse(fs.readFileSync("json/available_functions.json", "utf-8"));

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);
  await client.login();

  const userSessions = new Map(); // userId => session object

  client.onChannelMessage(async (event) => {
    const content = event?.content?.t?.trim();
    if (!content) return;

    const userId = event.author_id;
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);

    const session = userSessions.get(userId) || {
      seenHelp: false,
      uniHelp: false,
      uniMajor: false,
      uniSubMajor: false,
      uniSchool: false,
      selected: null
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

    // quit
    if (content === "uni!") {
      if (!session.uniHelp && !session.uniMajor && !session.uniSubMajor) {
        await message.reply({ t: "⚠️ Bạn chưa bắt đầu xem các ngành. Gửi lại uni!help để xem các tính năng hiện có." });
        return;
      }

      session.uniHelp = false;
      session.uniMajor = false;
      session.uniSubMajor = false;
      session.selected = null;
      session.uniSchool = false;

      await message.reply({ t: "👋 Đã dừng mọi hoạt động. Gửi lại uni!help để bắt đầu lại." });
      userSessions.set(userId, session);
      return;
    }
  });
}

main()
  .then(() => console.log("🤖 Bot started"))
  .catch((err) => console.error(err));