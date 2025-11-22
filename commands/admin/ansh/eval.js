const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { inspect } = require(`util`);
module.exports = {
  name: 'eval',
  description: 'Owners Cmds',
  category: 'Utility',
  cooldown: 5000,
  owner:true,
  async execute(client, message,args,prefix) {
    if(!args[0])
        {
            return message.channel.send({embeds : [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | Provide me something to evaluate`)]})
        }
        let code = args.join(" ");
        let ok;
        if (code.includes(`SECRET`) || code.includes(`mongo`)|| code.includes(`this.client.config`)|| code.includes(`client.config`)|| code.includes(`config.token`) || code.includes(`token`)||  code.includes(`TOKEN`) || code.includes("process.env")) {
            ok = "Ohhh Bkl, Kya krega Token ka G me Dalega Kya Barwe";
        } else {
        try{
            ok = await eval(args.join(' '));
            ok = inspect(ok,{depth : 0});
        } catch(e) { ok = inspect(e,{depth : 0}) }
    }
        let em = new EmbedBuilder().setColor(process.env.color).setDescription(`\`\`\`js\n${ok}\`\`\``);
        return message.channel.send({embeds : [em]});
  },
};
