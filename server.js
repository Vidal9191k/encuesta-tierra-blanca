const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const requestIp = require('request-ip'); // Para obtener la IP del cliente

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware para detectar IP del cliente
app.use(requestIp.mw());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Objeto de votos por candidato
const votos = {
  reynaldo: 0,
  juan: 0,
  edwin: 0,
  olivia: 0,
  jorge: 0,
  otro: 0
};

// Lista de IPs que ya votaron
const ipsQueVotaron = new Set();

// Conexión de cliente vía socket
io.on('connection', (socket) => {
  // Detectar IP del cliente
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

  // Enviar estado actual al conectarse
  socket.emit('updateVotes', { votos });

  // Al recibir un voto
  socket.on('vote', (candidato) => {
    if (ipsQueVotaron.has(ip)) {
      console.log(`Voto duplicado bloqueado para IP: ${ip}`);
      return;
    }

    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      ipsQueVotaron.add(ip);
      io.emit('updateVotes', { votos });
    }
  });
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
