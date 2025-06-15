const dotenv = require("dotenv");
const { MezonClient } = require("mezon-sdk");

dotenv.config();

async function main() {
  const client = new MezonClient(process.env.APPLICATION_TOKEN);

  await client.login();

  client.onChannelMessage(async (event) => {
    if (event?.content?.t === "*ping") {
      const channelFetch = await client.channels.fetch(event.channel_id)
      const messageFetch = await channelFetch.messages.fetch(event.message_id)

      // reply message
      await messageFetch.reply({ t: 'reply pong' })

      // create new channel message
      await channelFetch.send({ t: 'channel send pong' })

      // send DM message
      const clan = await client.clans.fetch(event.clan_id)
      const user = await clan.users.fetch(event.sender_id)
      await user.sendDM({t: 'hello DM'})
    }
  })
}

main()
  .then(() => {
    console.log("bot start!");
  })
  .catch((error) => {
    console.error(error);
  });
