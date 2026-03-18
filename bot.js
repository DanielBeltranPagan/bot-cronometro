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

// Función reutilizable para enviar el panel
async function enviarPanel(channel) {
    const row = new ActionRowBuilder().addComponents(
        Object.keys(TAREAS_INFO).map(id => 
            new ButtonBuilder()
                .setCustomId(id)
                .setLabel(`${TAREAS_INFO[id].emoji} ${TAREAS_INFO[id].nombre}`)
                .setStyle(ButtonStyle.Secondary)
        )
    );
    return await channel.send({ content: "📋 **Gestión de Actividades:**", components: [row] });
}

client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!gestion') {
        await enviarPanel(message.channel);
    }

    if (message.content === '!limpiartodo') {
        try {
            // Borramos el mensaje del usuario (!limpiartodo)
            await message.delete().catch(() => {});

            const fetched = await message.channel.messages.fetch({ limit: 100 });
            
            // Filtramos mensajes que sean del bot
            const mensajesBot = fetched.filter(m => m.author.id === client.user.id);
            
            // Borramos todos los mensajes del bot encontrados
            if (mensajesBot.size > 0) {
                await message.channel.bulkDelete(mensajesBot, true);
            }
            
            // Enviamos un aviso temporal y REGENERAMOS el panel
            const aviso = await message.channel.send("🧹 **Canal limpiado. Restableciendo panel...**");
            await enviarPanel(message.channel);
            
            // El aviso de limpieza desaparece rápido
            setTimeout(() => aviso.delete().catch(() => {}), 3000);

        } catch (error) {
            console.error("Error en limpieza:", error);
            message.channel.send("⚠️ No pude limpiar todos los mensajes (pueden ser demasiado antiguos).");
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const info = TAREAS_INFO[interaction.customId];
    if (!info) return interaction.reply({ content: "⚠️ Tarea no encontrada.", ephemeral: true });

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
        .setTimestamp();

    const msg = await interaction.editReply({ embeds: [embed] });

    setTimeout(async () => {
        try {
            await msg.delete().catch(() => {});
            
            const horaAcabado = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const avisoFinal = await interaction.channel.send(
                `✅ **${interaction.user.username}**, el tiempo de **${info.nombre}** ha terminado (Finalizado a las: **${horaAcabado}**).`
            );

            // El aviso de finalización se borra a las 3 horas
            setTimeout(() => {
                avisoFinal.delete().catch(() => {});
            }, 3 * 60 * 60 * 1000);

        } catch (e) {
            console.log("Error al procesar el final.");
        }
    }, info.duracion);
});

client.login(process.env.TOKEN);
