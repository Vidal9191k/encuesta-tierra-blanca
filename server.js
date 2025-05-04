const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const requestIp = require('request-ip');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware para detectar IP del cliente
app.use(requestIp.mw());

// Servir archivos estáticos desde "public"
app.use(express.static(path.join(__dirname, 'public')));

// Archivos para persistencia
const votosPath = path.join(__dirname, 'votos.json');
const ipsPath = path.join(__dirname, 'ips.json');

// Inicializar votos si no existen
if (!fs.existsSync(votosPath)) {
  fs.writeFileSync(votosPath, JSON.stringify({
    reynaldo: 0,
    juan: 0,
    edwing: 0,
    olivia: 0,
    jorge: 0,
    otro: 0
  }, null, 2));
}

// Inicializar lista de IPs si no existe
if (!fs.existsSync(ipsPath)) {
  fs.writeFileSync(ipsPath, JSON.stringify([]));
}

// Funciones para leer y guardar
const getVotos = () => JSON.parse(fs.readFileSync(votosPath));
const getIps = () => new Set(JSON.parse(fs.readFileSync(ipsPath)));
const guardarVotos = (votos) => fs.writeFileSync(votosPath, JSON.stringify(votos, null, 2));
const guardarIps = (ipsSet) => fs.writeFileSync(ipsPath, JSON.stringify([...ipsSet], null, 2));

// Manejo de socket
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const votos = getVotos();
  const ips = getIps();

  socket.emit('updateVotes', { votos });

  socket.on('vote', (candidato) => {
    if (ips.has(ip)) {
      console.log(`Voto duplicado bloqueado para IP: ${ip}`);
      return;
    }

    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      ips.add(ip);

      guardarVotos(votos);
      guardarIps(ips);

      io.emit('updateVotes', { votos });
    }
  });
});

// Ruta protegida para mostrar resultados
app.get('/admin-votos-2025', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privado', 'resultados.html'));
});

// Ruta temporal para resetear IPs
app.get('/admin-resetear-ips', (req, res) => {
  fs.writeFileSync(ipsPath, JSON.stringify([]));
  res.send('IPs reseteadas. Ahora puedes volver a votar desde este dispositivo.');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});


