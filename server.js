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
app.use(express.static(path.join(__dirname, 'public')));

// Archivos para persistencia
const votosPath = path.join(__dirname, 'votos.json');
const ipsPath = path.join(__dirname, 'ips.json');

// Inicializar datos si no existen
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

if (!fs.existsSync(ipsPath)) {
  fs.writeFileSync(ipsPath, JSON.stringify([]));
}

const getVotos = () => JSON.parse(fs.readFileSync(votosPath));
const getIps = () => new Set(JSON.parse(fs.readFileSync(ipsPath)));

const guardarVotos = (votos) =>
  fs.writeFileSync(votosPath, JSON.stringify(votos, null, 2));
const guardarIps = (ipsSet) =>
  fs.writeFileSync(ipsPath, JSON.stringify([...ipsSet], null, 2));

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

