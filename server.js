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

// Inicializar archivos si no existen
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

if (!fs.existsSync(ipsPath)) fs.writeFileSync(ipsPath, JSON.stringify([]));
if (!fs.existsSync(fingerprintsPath)) fs.writeFileSync(fingerprintsPath, JSON.stringify([]));
if (!fs.existsSync(votosPorIpPath)) fs.writeFileSync(votosPorIpPath, JSON.stringify({}));

// Funciones para obtener y guardar datos
const getVotos = () => JSON.parse(fs.readFileSync(votosPath));
const getIps = () => new Set(JSON.parse(fs.readFileSync(ipsPath)));
const getFingerprints = () => new Set(JSON.parse(fs.readFileSync(fingerprintsPath)));
const getVotosPorIp = () => JSON.parse(fs.readFileSync(votosPorIpPath));

const guardarVotos = (votos) => fs.writeFileSync(votosPath, JSON.stringify(votos, null, 2));
const guardarIps = (ipsSet) => fs.writeFileSync(ipsPath, JSON.stringify([...ipsSet], null, 2));
const guardarFingerprints = (fpSet) => fs.writeFileSync(fingerprintsPath, JSON.stringify([...fpSet], null, 2));
const guardarVotosPorIp = (data) => fs.writeFileSync(votosPorIpPath, JSON.stringify(data, null, 2));

// Cargar votos al iniciar el servidor (evita reseteo en cada conexión)
let votos = getVotos();

// Socket
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const ips = getIps();
  const fingerprints = getFingerprints();
  const votosPorIp = getVotosPorIp();
  const hoy = new Date().toISOString().slice(0, 10);

  // Emitir los votos actuales al cliente
  socket.emit('updateVotes', votos);

  socket.on('vote', ({ candidato, fingerprint }) => {
    if (
      ips.has(ip) ||
      fingerprints.has(fingerprint) ||
      votosPorIp[ip] === hoy
    ) {
      console.log(`❌ Voto bloqueado. IP: ${ip}, FP: ${fingerprint}, Fecha: ${hoy}`);
      return;
    }

    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      ips.add(ip);
      fingerprints.add(fingerprint);
      votosPorIp[ip] = hoy;

      // Guardar los cambios en los archivos
      guardarVotos(votos);
      guardarIps(ips);
      guardarFingerprints(fingerprints);
      guardarVotosPorIp(votosPorIp);

      // Emitir actualización a todos los clientes
      io.emit('updateVotes', votos);
      console.log(`✅ Voto registrado. Candidato: ${candidato}, IP: ${ip}`);
    }
  });
});

// Rutas
app.get('/admin-votos-2025', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privado', 'resultados.html'));
});

app.post('/admin-resetear-ips', (req, res) => {
  fs.writeFileSync(ipsPath, JSON.stringify([]));
  fs.writeFileSync(fingerprintsPath, JSON.stringify([]));
  fs.writeFileSync(votosPorIpPath, JSON.stringify({}));
  res.send('IPs, fingerprints y bloqueos por día han sido reseteados.');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
