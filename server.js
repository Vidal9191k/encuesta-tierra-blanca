const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const requestIp = require('request-ip');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(requestIp.mw());
app.use(express.static(path.join(__dirname, 'public')));

// Archivos para persistencia
const votosPath = path.join(__dirname, 'votos.json');
const ipsPath = path.join(__dirname, 'ips.json');
const fingerprintsPath = path.join(__dirname, 'fingerprints.json');

// Inicializar votos
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

// Inicializar lista de IPs y fingerprints
if (!fs.existsSync(ipsPath)) fs.writeFileSync(ipsPath, JSON.stringify([]));
if (!fs.existsSync(fingerprintsPath)) fs.writeFileSync(fingerprintsPath, JSON.stringify([]));

// Funciones
const getVotos = () => JSON.parse(fs.readFileSync(votosPath));
const getIps = () => new Set(JSON.parse(fs.readFileSync(ipsPath)));
const getFingerprints = () => new Set(JSON.parse(fs.readFileSync(fingerprintsPath)));

const guardarVotos = (votos) => fs.writeFileSync(votosPath, JSON.stringify(votos, null, 2));
const guardarIps = (ipsSet) => fs.writeFileSync(ipsPath, JSON.stringify([...ipsSet], null, 2));
const guardarFingerprints = (fpSet) => fs.writeFileSync(fingerprintsPath, JSON.stringify([...fpSet], null, 2));

// Socket
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const votos = getVotos();
  const ips = getIps();
  const fingerprints = getFingerprints();

  socket.emit('updateVotes', { votos });

  socket.on('vote', ({ candidato, fingerprint }) => {
    if (ips.has(ip) || fingerprints.has(fingerprint)) {
      console.log(`Voto bloqueado. IP: ${ip}, Fingerprint: ${fingerprint}`);
      return;
    }

    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      ips.add(ip);
      fingerprints.add(fingerprint);

      guardarVotos(votos);
      guardarIps(ips);
      guardarFingerprints(fingerprints);

      io.emit('updateVotes', { votos });
    }
  });
});

// Resultados
app.get('/admin-votos-2025', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privado', 'resultados.html'));
});

// Reset
app.get('/admin-resetear-ips', (req, res) => {
  fs.writeFileSync(ipsPath, JSON.stringify([]));
  fs.writeFileSync(fingerprintsPath, JSON.stringify([]));
  res.send('IPs y fingerprints reseteadas.');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

