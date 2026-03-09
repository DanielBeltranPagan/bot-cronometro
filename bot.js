const http = require('http');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// --- SERVIDOR PARA RENDER (Heartbeat) ---
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot activo\n');
}).listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// --- CONFIGURACIÓN DE ACTIVIDADES ---
const TAREAS_INFO = {
    sembrado: { nombre: "Sembrado", duracion: 16 * 60 * 60 * 1000, img: "https://img.gta5-mods.com/q95/images/weedshop-sp-fivem/7d732e-EVzgKMK.jpeg", emoji: "🌿" },
    secado: { nombre: "Secado", duracion: 6 * 60 * 60 * 1000, img: "https://notasdehumo.com/wp-content/uploads/2015/04/marihuana-secandose2.jpg", emoji: "💨" },
    atraco_edificio: { nombre: "Atraco Edificio", duracion: 30 * 60 * 1000, img: "https://i.ytimg.com/vi/2JelbjReevo/hq720.jpg", emoji: "🏢" },
    atraco_casa: { nombre: "Atraco Casa", duracion: 30 * 60 * 1000, img: "https://static.wikia.nocookie.net/esgta/images/e/e5/ResidenciaClintonNextGenV.jpg/revision/latest?cb=20141121201436", emoji: "🏠" }
};

function formatearTiempo(ms) {
    if (ms <= 0) return "FINALIZADO";
    let s = Math.floor(ms / 1000);
    let h = Math.floor(s / 3600);
    let m = Math.floor((s % 3600) / 60);
    let seg = s % 60;
    return `${h}h ${m}m ${seg}s`;
}

// --- COMANDOS DE MENSAJE ---
client.on('messageCreate', async message => {
    // Comando para mostrar el panel de botones
    if (message.content === '!gestion') {
        const row = new ActionRowBuilder().addComponents(
            Object.keys(TAREAS_INFO).map(id => 
                new ButtonBuilder()
                    .setCustomId(id)
                    .setLabel(`${TAREAS_INFO[id].emoji} ${TAREAS_INFO[id].nombre}`)
                    .setStyle(ButtonStyle.Secondary)
            )
        );
        await message.channel.send({ content: "📋 **Selecciona una actividad para crear una tarjeta de seguimiento:**", components: [row] });
    }
    
    // Comando para limpiar SOLO tarjetas (mantiene los botones)
    if (message.content === '!limpiar') {
        const messages = await message.channel.messages.fetch({ limit: 50 });
        const tarjetas = messages.filter(m => m.author.id === client.user.id && m.embeds.length > 0 && m.components.length === 0);
        await message.channel.bulkDelete(tarjetas, true);
        await message.reply("🧹 **Tarjetas limpiadas.**").then(m => setTimeout(() => m.delete(), 3000));
    }

    // Comando para borrar TODO lo del bot
    if (message.content === '!borrartodo') {
        const messages = await message.channel.messages.fetch({ limit: 50 });
        const todoDelBot = messages.filter(m => m.author.id === client.user.id);
        await message.channel.bulkDelete(todoDelBot, true);
    }

    // Historial
    if (message.content === '!logsbanda') {
        const logs = fs.existsSync('historial_tareas.txt') ? fs.readFileSync('historial_tareas.txt', 'utf8') : "Sin logs.";
        await message.author.send("📜 **Historial de la banda:**\n```" + logs.slice(-1500) + "```");
    }
});

// --- INTERACCIÓN CON BOTONES ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const info = TAREAS_INFO[interaction.customId];
    if (!info) return interaction.reply({ content: "⚠️ Botón no reconocido.", ephemeral: true });

    const fin = Date.now() + info.duracion;
    await interaction.deferReply();

    const embed = new EmbedBuilder()
        .setTitle(`${info.emoji} ${info.nombre}`)
        .setDescription(`👤 **Iniciado por:** ${interaction.user.username}\n⏳ **Tiempo:** Calculando...`)
        .setImage(info.img)
        .setColor(0x2F3136)
        .setTimestamp();

    const msg = await interaction.editReply({ embeds: [embed] });
    fs.appendFileSync('historial_tareas.txt', `${new Date().toLocaleString()} - ${interaction.user.username}: INICIÓ ${info.nombre}\n`);

    const interval = setInterval(async () => {
        const restante = fin - Date.now();
        const nuevaTarjeta = EmbedBuilder.from(embed)
            .setDescription(`👤 **Iniciado por:** ${interaction.user.username}\n⏳ **Quedan:** ${formatearTiempo(restante)}`);
        
        try {
            await msg.edit({ embeds: [nuevaTarjeta] });
            if (restante <= 0) clearInterval(interval);
        } catch (e) { clearInterval(interval); }
    }, 5000);
});



client.login(process.env.TOKEN);
