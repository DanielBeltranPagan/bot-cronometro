const http = require('http');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// --- SERVIDOR PARA RENDER (Keep-Alive) ---
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot activo\n');
}).listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// --- CONFIGURACIÓN DE TAREAS ---
const TAREAS_INFO = {
    sembrado: { nombre: "Sembrado", duracion: 16 * 60 * 60 * 1000, img: "https://img.gta5-mods.com/q95/images/weedshop-sp-fivem/7d732e-EVzgKMK.jpeg", emoji: "🌿" },
    sembrado_coca: { nombre: "Sembrado Coca", duracion: 3 * 60 * 60 * 1000, img: "https://i.imgur.com/tu_imagen_coca.jpg", emoji: "🍃" },
    secado: { nombre: "Secado", duracion: 6 * 60 * 60 * 1000, img: "https://notasdehumo.com/wp-content/uploads/2015/04/marihuana-secandose2.jpg", emoji: "💨" },
    atraco_edificio: { nombre: "Atraco Edificio", duracion: 30 * 60 * 1000, img: "https://i.ytimg.com/vi/2JelbjReevo/hq720.jpg", emoji: "🏢" },
    atraco_casa: { nombre: "Atraco Casa", duracion: 30 * 60 * 1000, img: "https://static.wikia.nocookie.net/esgta/images/e/e5/ResidenciaClintonNextGenV.jpg/revision/latest?cb=20141121201436", emoji: "🏠" }
};

// --- EVENTO READY ---
client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// --- COMANDOS DE MENSAJE ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!gestion') {
        const row = new ActionRowBuilder().addComponents(
            Object.keys(TAREAS_INFO).map(id => 
                new ButtonBuilder()
                    .setCustomId(id)
                    .setLabel(`${TAREAS_INFO[id].emoji} ${TAREAS_INFO[id].nombre}`)
                    .setStyle(ButtonStyle.Secondary)
            )
        );
        await message.channel.send({ content: "📋 **Selecciona una actividad para iniciar la cuenta atrás:**", components: [row] });
    }

    if (message.content === '!limpiar') {
        const messages = await message.channel.messages.fetch({ limit: 50 });
        // Filtra mensajes del bot que sean tarjetas de tiempo (tienen embed)
        const tarjetas = messages.filter(m => m.author.id === client.user.id && m.embeds.length > 0);
        await message.channel.bulkDelete(tarjetas, true);
        message.channel.send("🧹 Limpieza de tarjetas completada.").then(m => setTimeout(() => m.delete(), 3000));
    }
});

// --- INTERACCIÓN CON BOTONES ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const info = TAREAS_INFO[interaction.customId];
    if (!info) return interaction.reply({ content: "⚠️ Tarea no encontrada.", ephemeral: true });

    // Calculamos el momento exacto en que termina (en segundos Unix)
    const tiempoFinalUnix = Math.floor((Date.now() + info.duracion) / 1000);

    await interaction.deferReply();

    const embed = new EmbedBuilder()
        .setTitle(`${info.emoji} ${info.nombre}`)
        .setColor(0x2F3136)
        .setImage(info.img)
        .setDescription(
            `👤 **Iniciado por:** ${interaction.user.username}\n` +
            `🏁 **Finaliza:** <t:${tiempoFinalUnix}:F>\n` + 
            `⏳ **Tiempo restante:** <t:${tiempoFinalUnix}:R>`
        )
        .setFooter({ text: "La cuenta atrás se actualiza automáticamente" })
        .setTimestamp();

    const msg = await interaction.editReply({ embeds: [embed] });

    // Guardar en log local
    const logEntry = `${new Date().toLocaleString()} - ${interaction.user.username}: INICIÓ ${info.nombre}\n`;
    fs.appendFileSync('historial_tareas.txt', logEntry);

    // Programar borrado automático al finalizar
    setTimeout(async () => {
        try {
            await msg.delete();
            // Opcional: Avisar en el canal que terminó
            await interaction.channel.send(`✅ **${interaction.user.username}**, el tiempo de **${info.nombre}** ha terminado.`);
        } catch (e) {
            console.log("El mensaje ya no existe o no se pudo borrar.");
        }
    }, info.duracion);
});

// --- LOGIN ---
client.login(process.env.TOKEN);
