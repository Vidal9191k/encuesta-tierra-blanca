const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

// Conexión de cliente vía socket
io.on('connection', (socket) => {
  // Enviar estado actual al conectarse
  socket.emit('updateVotes', { votos });  // ✅ Enviar dentro de un objeto

  // Al recibir un voto
  socket.on('vote', (candidato) => {
    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      io.emit('updateVotes', { votos });  // ✅ Enviar dentro de un objeto
    }
  });
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
