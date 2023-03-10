const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');

const rest = new REST({ version: '10' }).setToken(token);

const loadCommands = async (commands) => {
	if (!commands.length) {
		console.log('No commands provided.');
		return;
	}

	try {
		console.log(`Started refreshing ${commands.length} application commands.`);
		const commandsArray = [];

		for (let command of commands) {
			commandsArray.push(command.data.toJSON());
		}

		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commandsArray },
		);

		console.log(`Successfully reloaded ${data.length} application commands.`);
	} catch (error) {
		console.error(error);
	}
};

module.exports = loadCommands;