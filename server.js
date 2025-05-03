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
  socket.emit('updateVotes', { votos });

  socket.on('vote', (candidato) => {
    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      io.emit('updateVotes', { votos });
    }
  });
});

// ✅ Ruta fallback para aplicaciones de una sola página (Render lo necesita)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
