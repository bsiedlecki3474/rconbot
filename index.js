const Discord = require('discord.js')
const client = new Discord.Client()
const connect = require('srcds-rcon');
const cfg = require('./config.json');

let cases = [];

client.on('ready', async () => {
    if (cfg.debug) console.log("Successfully logged: " + client.user.tag)
    client.user.setStatus(cfg.botStatus.type)
    client.user.setActivity(cfg.botStatus.name, { type: cfg.botStatus.activity })
})

client.on('message', message => {
    help = () => {
        let rolename = message.guild.roles.cache.get(cfg.adminRoleId).name

        let welcomeMessage = `Version: **${cfg.version}**\nAuthor: **emKay#9189**\n\nList of commands:\n\`\`\`ldif`
        welcomeMessage += `\n${cfg.prefix}.prefix | ${cfg.prefix}.prefix.show: show current prefix.`
        if (message.member.roles.cache.has(cfg.adminRoleId)) {
            welcomeMessage += `\n${cfg.prefix}.prefix.change(newprefix): change current prefix to newprefix. [${rolename}]`
            welcomeMessage += `\n${cfg.prefix}.access: show additional priviledges role. [${rolename}]`
            welcomeMessage += `\n${cfg.prefix}.access.change(newrole): change current additional priviledges role to newrole. [${rolename}]`
            welcomeMessage += `\n${cfg.prefix}.servername.command: runs command on servername. [${rolename}]\nAvailable servers:`
                            + Object.keys(cfg.servers).map(key => `\n- ${key} (${cfg.servers[key].name})`) 
        }

        welcomeMessage += '\`\`\`'
    
        message.channel.send(welcomeMessage)
    }

    if (!message.content.startsWith(cfg.prefix) || message.author.bot)
        return;

    if (message.content === cfg.prefix) help()

    const cmd = message.content.slice(cfg.prefix.length+1).trim().toLowerCase().split(/\.+/g)

    const getFunc = (cmd, method = '') => {
        const rgxp = new RegExp(`${method}(.*)?\\((.*)?\\)`, "g")
        const matches = rgxp.exec(cmd)

        return {
            ...{name: matches ? matches[1] : cmd},
            ...matches && {args: matches[2] ? matches[2].replace(/['"\s]+/g, '').split(',') : []}
        };
    }

    const fn = getFunc(cmd[0]);
    const method = cmd[1] ? getFunc(cmd[1]) : null;

    if (message.channel.id === cfg.messageChannelId) {
        switch (fn.name) {
            case 'clear':
                if (message.member.roles.cache.has(cfg.adminRoleId)) {
                    async function clear() {
                        message.delete().catch(e => message.channel.send('Missing permissions :('))
                        const limit = fn.args && fn.args.length === 1 && parseInt(fn.args[0]) < 99 ? parseInt(fn.args[0]) : 99;
                        const fetched = await message.channel.messages.fetch({ limit })
                        message.channel.bulkDelete(fetched)
                    }
                    clear();  
                } break;
            case 'access':
                if (message.member.roles.cache.has(cfg.adminRoleId)) {
                    let rolename = message.guild.roles.cache.get(cfg.adminRoleId).name
                    if (!method || !method.name || method.name === 'show') {
                        message.channel.send(`Additional priviledges role: *${rolename}*`)
                    } else if (method.name === 'change' && method.args && method.args.length === 1) {
                        let newAdminRole = message.guild.roles.cache.get(method.args[0])
                        if (newAdminRole) {
                            let previousRolename = rolename
                            cfg.adminRoleId = method.args[0]
                            message.channel.send(`Additional priviledges role changed: ${previousRolename} -> ${newAdminRole}.`)
                        } else message.channel.send('Invalid role ID.')
                    }
                } break;
            case 'help': help(); break;
            case 'prefix':
                if (!method || !method.name || method.name === 'show')
                    message.channel.send(`Current prefix: **${cfg.prefix}**\nChange prefix: \`${cfg.prefix}.prefix.change(newprefix)\``)
    
                else if (method.name === 'change' && method.args && method.args.length === 1)  {
                    let oldprefix = cfg.prefix
                    cfg.prefix = method.args[0]
                    message.channel.send(`Prefix changed: **${oldprefix}** -> **${cfg.prefix}**`)
                } break;
            default:
                if (message.member.roles.cache.has(cfg.adminRoleId)) {
                    if (Object.keys(cfg.servers).includes(fn.name)) {
                        const { name, address, password } = cfg.servers[fn.name]
    
                        let command = (!method || !method.name) ? 'status' : method.name
                        let rcon = connect({ address, password })
            
                        rcon.connect().then(
                            () => rcon.command(command).then(response => message.channel.send(`\`${response}\``))
                        ).then(
                            () => rcon.disconnect()
                        ).catch(err => {
                            message.channel.send('Error: ' + err)
                            if (cfg.debug) {
                                console.log('caught', err);
                                console.log(err.stack);
                            }
                        });
                    }
                }
                break;
        }
    }
    
});

client.login(cfg.token)