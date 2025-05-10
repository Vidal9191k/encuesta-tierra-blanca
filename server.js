const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const requestIp = require('request-ip');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware IP
app.use(requestIp.mw());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de archivos
const votosPath = path.join(__dirname, 'votos.json');
const ipsPath = path.join(__dirname, 'ips.json');
const fingerprintsPath = path.join(__dirname, 'fingerprints.json');
const votosPorIpPath = path.join(__dirname, 'votos_por_ip.json');

// Variables en memoria
let votos = {
  reynaldo: 0,
  juan: 0,
  edwing: 0,
  olivia: 0,
  jorge: 0,
  otro: 0,
};
let ips = new Set();
let fingerprints = new Set();
let votosPorIp = {};

// Cargar datos al iniciar el servidor
if (fs.existsSync(votosPath)) votos = JSON.parse(fs.readFileSync(votosPath));
if (fs.existsSync(ipsPath)) ips = new Set(JSON.parse(fs.readFileSync(ipsPath)));
if (fs.existsSync(fingerprintsPath)) fingerprints = new Set(JSON.parse(fs.readFileSync(fingerprintsPath)));
if (fs.existsSync(votosPorIpPath)) votosPorIp = JSON.parse(fs.readFileSync(votosPorIpPath));

// Guardado seguro al cerrar el servidor
const guardarDatos = () => {
  fs.writeFileSync(votosPath, JSON.stringify(votos, null, 2));
  fs.writeFileSync(ipsPath, JSON.stringify([...ips], null, 2));
  fs.writeFileSync(fingerprintsPath, JSON.stringify([...fingerprints], null, 2));
  fs.writeFileSync(votosPorIpPath, JSON.stringify(votosPorIp, null, 2));
};

process.on('SIGTERM', guardarDatos);
process.on('SIGINT', guardarDatos);

// Socket
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const hoy = new Date().toISOString().slice(0, 10);

  // Emitir votos al cliente cuando se conecta
  socket.emit('updateVotes', { votos });

  socket.on('vote', ({ candidato, fingerprint }) => {
    // Verificar que no se haya votado desde esta IP o fingerprint hoy
    if (ips.has(ip) || fingerprints.has(fingerprint) || votosPorIp[ip] === hoy) {
      console.log(`❌ Voto bloqueado. IP: ${ip}, FP: ${fingerprint}, Fecha: ${hoy}`);
      return;
    }

    // Asegurarse de que el candidato sea válido
    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      ips.add(ip);
      fingerprints.add(fingerprint);
      votosPorIp[ip] = hoy;

      // Emitir actualización en tiempo real
      io.emit('updateVotes', { votos });
      console.log(`✅ Voto registrado. Candidato: ${candidato}, IP: ${ip}`);
    }
  });
});

// Rutas
app.get('/admin-votos-2025', (req, res) => {
  console.log("Enviando resultados al panel de administración");
  res.sendFile(path.join(__dirname, 'public', 'privado', 'resultados.html'));
});

app.get('/admin-resetear-ips', (req, res) => {
  ips = new Set();
  fingerprints = new Set();
  votosPorIp = {};
  console.log('IPs, fingerprints y bloqueos por día han sido reseteados.');
  res.send('IPs, fingerprints y bloqueos por día han sido reseteados.');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
