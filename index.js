const { Client, Collection, Events, GatewayIntentBits, SlashCommandBuilder, RateLimitError } = require('discord.js');
const { channelId, adminRoleId, token, servers } = require('./config.json');
const connect = require('srcds-rcon');

const loadCommands = require('./loadCommands.js');

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
]});

client.commands = new Collection();

let rcon = null;
let serverName = null;

const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('connect')
            .setDescription('Connect to a server via RCON')
            .addStringOption(option => option
                .setName('server')
                .setDescription('Server name')
                .setRequired(true)
                .addChoices(...Object.keys(servers)?.map(key => ({
                    name: servers[key].name,
                    value: key
                })))
            ),
        execute: async (interaction) => {
            const server = interaction.options.getString('server');
            if (!server) {
                interaction.reply('No server provided.');
                return;
            }

            const { name, address, password } = servers[server];

            try {
                rcon = connect({ address, password })
                await rcon.connect();
            } catch (e) {
                console.log(e);
                interaction.reply('An error occured');
            }
            
            const disconnected = serverName ? `Disconnected from ${serverName}.\n` : '';
            serverName = name;

            interaction.reply(`${disconnected}Connected to ${serverName}.`);
        } 
    },
    {
        data: new SlashCommandBuilder()
            .setName('disconnect')
            .setDescription('End RCON connection'),
        execute: async (interaction) => {
            try {
                rcon.disconnect();
                
            } catch (e) {
                console.log(e);
                interaction.reply('An error occured');
            } finally {
                interaction.reply(`Disconnected from ${serverName}.`);
                serverName = null;
                rcon = null;
            }
        } 
    },
];

loadCommands(commands);

for (let command of commands) {
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command.execute);
    } else {
        console.log(`[WARNING] The command \"${command.name}\" is missing a required "data" or "execute" property.`);
    }
}

client.once(Events.ClientReady, async c => {
	console.log(`Bot ${c.user.tag} is ready to roll!`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
    if (interaction.user.bot) return;

    if (interaction.channel.id !== channelId) {
        return;
    }

    if (!Array.from(interaction.member.roles.cache.keys()).includes(adminRoleId)) {
        interaction.reply({
            content: 'You have no access to use rcon commands.',
            ephemeral: true
        })
    }

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command(interaction);
	} catch (error) {
		console.error(`Error executing ${interaction.commandName}`);
		console.error(error);
	}
});

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) return;

    if (rcon === null) {
        message.reply('You need to be connected via rcon to run commands.\nUse `/connect` to set up a connection.');
        return;
    }

    const command = message.content;
    const response = await rcon.command(command);
    const logRegex = /L\s\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:(.*)/g;
    const commandRegex = /\"\d+.\d+.\d+.\d+:\d+\":\scommand\s"(.*)"/g;
    const end = '#end';
    if (response) {
        const formattedMessage = response
            .replaceAll(logRegex, '')
            .replaceAll(commandRegex, '')
            .replace(end, '');
        message.reply(`\`\`\`${formattedMessage}\`\`\``);
    }
})

client.login(token);