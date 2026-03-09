const http = require('http');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// Servidor para mantener a Render activo
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot activo\n');
}).listen(process.env.PORT || 3000);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TAREAS_INFO = {
    sembrado: { nombre: "Sembrado", duracion: 16 * 60 * 60 * 1000, img: "https://img.gta5-mods.com/q95/images/weedshop-sp-fivem/7d732e-EVzgKMK.jpeg" },
    secado: { nombre: "Secado", duracion: 6 * 60 * 60 * 1000, img: "https://notasdehumo.com/wp-content/uploads/2015/04/marihuana-secandose2.jpg" },
    atraco_edificio: { nombre: "Atraco Edificio", duracion: 30 * 60 * 1000, img: "https://i.ytimg.com/vi/2JelbjReevo/hq720.jpg" },
    atraco_casa: { nombre: "Atraco Casa", duracion: 30 * 60 * 1000, img: "https://static.wikia.nocookie.net/esgta/images/e/e5/ResidenciaClintonNextGenV.jpg/revision/latest?cb=20141121201436" }
};

function formatearTiempo(ms) {
    if (ms <= 0) return "FINALIZADO";
    let s = Math.floor(ms / 1000);
    let h = Math.floor(s / 3600);
    let m = Math.floor((s % 3600) / 60);
    let seg = s % 60;
    return `${h}h ${m}m ${seg}s`;
}

// Mensaje con los botones para iniciar tareas
function crearPanelMenu() {
    const row = new ActionRowBuilder().addComponents(
        ['sembrado', 'secado', 'atraco_edificio', 'atraco_casa'].map(id => 
            new ButtonBuilder().setCustomId(id).setLabel(id.replace('_', ' ').toUpperCase()).setStyle(ButtonStyle.Secondary)
        )
    );
    return { content: "📋 **Selecciona una actividad para crear una tarjeta de seguimiento:**", components: [row] };
}

client.on('messageCreate', async message => {
    if (message.content === '!gestion') {
        await message.channel.send(crearPanelMenu());
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const info = TAREAS_INFO[interaction.customId];
    const fin = Date.now() + info.duracion;

    // Creamos la tarjeta
    const embed = new EmbedBuilder()
        .setTitle(`🚀 ${info.nombre}`)
        .setDescription(`👤 **Iniciado por:** ${interaction.user.username}\n⏳ **Tiempo:** Calculando...`)
        .setImage(info.img)
        .setColor(0x2F3136)
        .setTimestamp();

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Registro en log
    fs.appendFileSync('historial_tareas.txt', `${new Date().toLocaleString()} - ${interaction.user.username}: INICIÓ ${info.nombre}\n`);

    // Intervalo específico para esta tarjeta (cronómetro en tiempo real)
    const interval = setInterval(async () => {
        const restante = fin - Date.now();
        const nuevaTarjeta = EmbedBuilder.from(embed)
            .setDescription(`👤 **Iniciado por:** ${interaction.user.username}\n⏳ **Quedan:** ${formatearTiempo(restante)}`);
        
        await msg.edit({ embeds: [nuevaTarjeta] }).catch(() => clearInterval(interval));
        
        if (restante <= 0) clearInterval(interval);
    }, 5000);
});

client.login(process.env.TOKEN);
