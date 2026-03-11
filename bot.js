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
    
    // Registrar en logs
    fs.appendFileSync('historial_tareas.txt', `${new Date().toLocaleString()} - ${interaction.user.username}: INICIÓ ${info.nombre}\n`);

    const interval = setInterval(async () => {
        const restante = fin - Date.now();
        
        if (restante <= 0) {
            clearInterval(interval);
            try {
                // 1. Intentamos borrar el mensaje cuando acaba el tiempo
                await msg.delete();
                // 2. Opcional: Avisar en el canal que terminó (puedes quitar esto si no lo quieres)
                await interaction.channel.send(`✅ **${info.nombre}** de ${interaction.user.username} ha finalizado.`);
            } catch (e) {
                console.error("No se pudo borrar el mensaje o enviar aviso:", e);
            }
            return;
        }

        // Actualizar el embed con el tiempo restante
        const nuevaTarjeta = EmbedBuilder.from(embed)
            .setDescription(`👤 **Iniciado por:** ${interaction.user.username}\n⏳ **Quedan:** ${formatearTiempo(restante)}`);
        
        try {
            await msg.edit({ embeds: [nuevaTarjeta] });
        } catch (e) { 
            // Si el mensaje fue borrado manualmente antes de tiempo, detenemos el intervalo
            clearInterval(interval); 
        }
    }, 5000);
});
