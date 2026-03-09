const http = require('http');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// --- PARCHE PARA RENDER (Evita error de "No open ports detected") ---
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

const TAREAS_INFO = {
    sembrado: { nombre: "Sembrado", duracion: 16 * 60 * 60 * 1000 },
    secado: { nombre: "Secado", duracion: 6 * 60 * 60 * 1000 },
    atraco_edificio: { nombre: "Atraco Edificio", duracion: 30 * 60 * 1000 },
    atraco_casa: { nombre: "Atraco Casa", duracion: 30 * 60 * 1000 }
};

let tareasActivas = [];

// Formateo: 0h 0m 0s
function formatearTiempo(ms) {
    if (ms <= 0) return "FINALIZADO";
    let totalS = Math.floor(ms / 1000);
    let h = Math.floor(totalS / 3600);
    let m = Math.floor((totalS % 3600) / 60);
    let s = totalS % 60;
    return `${h}h ${m}m ${s}s`;
}

function crearPanel() {
    const embed = new EmbedBuilder()
        .setTitle("⏱️ CRONÓMETRO DE TAREAS")
        .setColor(0x2F3136)
        .setTimestamp();

    if (tareasActivas.length === 0) {
        embed.setDescription("⏳ *El cronómetro está en espera... pulsa un botón para iniciar.*");
    } else {
        let desc = "";
        tareasActivas.forEach((t, index) => {
            const restante = t.fin - Date.now();
            desc += `**${index + 1}. ${t.nombre}**\n👤 Iniciado por: ${t.usuario}\n⏲️ **${formatearTiempo(restante)}**\n--------------------------\n`;
        });
        embed.setDescription(desc);
    }
    
    const row = new ActionRowBuilder().addComponents(
        ['sembrado', 'secado', 'atraco_edificio', 'atraco_casa', 'limpiar'].map(id => 
            new ButtonBuilder()
                .setCustomId(id)
                .setLabel(id.replace('_', ' ').toUpperCase())
                .setStyle(id === 'limpiar' ? ButtonStyle.Danger : ButtonStyle.Secondary)
        )
    );
    
    return { embeds: [embed], components: [row] };
}



client.on('messageCreate', async message => {
    if (message.content === '!panel') {
        const msg = await message.channel.send(crearPanel());
        setInterval(async () => { await msg.edit(crearPanel()).catch(() => {}); }, 5000);
    }
    if (message.content === '!verlogs') {
        const logs = fs.existsSync('historial_tareas.txt') ? fs.readFileSync('historial_tareas.txt', 'utf8') : "Sin logs.";
        await message.author.send("📜 **Historial de la banda:**\n```" + logs.slice(-1500) + "```");
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === 'limpiar') {
        tareasActivas = [];
        await interaction.update(crearPanel());
        return;
    }

    const info = TAREAS_INFO[interaction.customId];
    tareasActivas.push({ 
        nombre: info.nombre, 
        fin: Date.now() + info.duracion, 
        usuario: interaction.user.username 
    });
    
    fs.appendFileSync('historial_tareas.txt', `${new Date().toLocaleString()} - ${interaction.user.username}: INICIÓ ${info.nombre}\n`);
    await interaction.update(crearPanel());
});

client.login(process.env.TOKEN);
