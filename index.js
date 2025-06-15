const dotenv = require("dotenv");
const fs = require("fs");
const { MezonClient } = require("mezon-sdk");

dotenv.config();

const majorsData = JSON.parse(fs.readFileSync("nganh_dai_hoc_2025.json", "utf-8"));
const availableFunctions = JSON.parse(fs.readFileSync("available_functions.json", "utf-8"));

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);

  await client.login();
  const seenHelp = new Set(); // Track users who have seen the menu
  let uniMajor = false; // Flag to prevent multiple menu displays
  let uniHelp = false; // Flag to prevent multiple help displays

  client.onChannelMessage(async (event) => {
    const content = event?.content?.t?.trim();
    if (!content) return;

    const userId = event.author_id;
    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);

    if (content === "uni!help") {
      seenHelp.add(userId); // Allow one selection
      uniHelp = true; // Set flag to true
      const help = availableFunctions.map((item, index) => `${index + 1}. ${item.tinh_nang} - ${item.mo_ta}`).join("\n");


      await message.reply({
        t: `💁🏻‍♀️ Hello, welcome to UniPal!\n\n${help}\n\n📩 Gửi số (1, 2, 3...) để trải nghiệm các tính năng tương ứng.`
      });
      return;
    }


    if (/^\d+$/.test(content) && uniHelp) {
      uniHelp = false; // Reset help flag

      const index = parseInt(content) - 1;

      // functions stored in availableFunctions.json
      if (index >= 0 && index < availableFunctions.length) {
          const selected = availableFunctions[index];
          if (selected.tinh_nang === "Xem danh sách các khối ngành") {

          const major = majorsData
            .map((item, index) => `${index + 1}. ${item.khoi_nganh.split("\n")[0]}`)
            .join("\n");

          uniMajor = true; // Set flag to true

          await message.reply({
            t: `📚 Danh sách khối ngành:\n${major}\n\n📩 Gửi số (1, 2, 3...) để xem các ngành trong khối.\n\n*Lưu ý* Bấm "uni!" để dừng xem các ngành`
          });
          return;
        }
      }
    }

    if (/^\d+$/.test(content) && uniMajor && !uniHelp) {
      if (!seenHelp.has(userId)) {
        await message.reply({ t: "⚠️ Hãy gửi uni!help trước để xem các tính năng hiện có." });
        return;
      }
      // majors in majorsData.json
      const index = parseInt(content) - 1;
      if (index >= 0 && index < majorsData.length) {
        const selected = majorsData[index];
        const nganhList = selected.nganh
          .map((nganh, i) => `${i + 1}. ${nganh.ten_nganh} - [Chi tiết](${nganh.url})`)
          .join("\n");

        await message.reply({
          t: `📂 "${selected.khoi_nganh.split("\n")[0]}" có ${selected.nganh.length} ngành:\n${nganhList}`
        });
      } else {
        await message.reply({ t: "❌ Số không hợp lệ. Gửi lại uni!help để xem các tính năng hiện có." });
      }

      return;
    } else if (content === "uni!") {
      seenHelp.delete(userId); // Remove immediately after first valid use
      if (!uniMajor && !uniHelp) {
        await message.reply({ t: "⚠️ Bạn chưa bắt đầu xem các ngành. Gửi lại uni!help để xem các tính năng hiện có." });
        return;
      }
      if (uniHelp) {
        uniHelp = false; // Reset help flag
        await message.reply({ t: "👋 Đã dừng xem menu. Gửi lại uni!help để xem các tính năng hiện có." });
        return;
      }
      if (uniMajor) {
        uniMajor = false; // Reset flag
        await message.reply({ t: "👋 Đã dừng xem các ngành. Gửi lại uni!help để xem các tính năng hiện có." });
      } else {
        await message.reply({ t: "⚠️ Bạn chưa bắt đầu xem các ngành. GGửi lại uni!help để xem các tính năng hiện có." });
      }

      return;
    }
  });
}

main()
  .then(() => console.log("🤖 Bot started"))
  .catch((err) => console.error(err));
