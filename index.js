const dotenv = require("dotenv");
const fs = require("fs");
const { MezonClient } = require("mezon-sdk");

dotenv.config();

const data = JSON.parse(fs.readFileSync("nganh_dai_hoc_2025.json", "utf-8"));

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);

  await client.login();

  client.onChannelMessage(async (event) => {
    const content = event?.content?.t?.trim();

    if (!content) return;

    const channel = await client.channels.fetch(event.channel_id);
    const message = await channel.messages.fetch(event.message_id);

    if (content === "*menu") {
      // Hiển thị danh sách khối ngành
      const menu = data
        .map((item, index) => `${index + 1}. ${item.khoi_nganh.split("\n")[0]}`)
        .join("\n");

      await message.reply({ t: `📚 Danh sách khối ngành:\n${menu}\n\n📩 Gửi số (1, 2, 3...) để xem các ngành trong khối.` });
    } else if (/^\d+$/.test(content)) {
      const index = parseInt(content) - 1;

      if (index >= 0 && index < data.length) {
        const selected = data[index];
        const nganhList = selected.nganh
          .map((nganh, i) => `${i + 1}. ${nganh.ten_nganh} - [Chi tiết](${nganh.url})`)
          .join("\n");

        await message.reply({
          t: `📂 *${selected.khoi_nganh.split("\n")[0]}* có ${selected.nganh.length} ngành:\n${nganhList}`
        });
      } else {
        await message.reply({ t: "❌ Số không hợp lệ. Hãy gửi *menu để xem lại danh sách khối ngành." });
      }
    }
  });
}

main()
  .then(() => console.log("🤖 Bot started"))
  .catch((err) => console.error(err));
