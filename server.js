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
const getVotos = () => {
  if (fs.existsSync(votosPath)) {
    return JSON.parse(fs.readFileSync(votosPath));
  } else {
    return { reynaldo: 0, juan: 0, edwing: 0, olivia: 0, jorge: 0, otro: 0 };
  }
};

const getIps = () => new Set(JSON.parse(fs.readFileSync(ipsPath)));
const getFingerprints = () => new Set(JSON.parse(fs.readFileSync(fingerprintsPath)));
const getVotosPorIp = () => JSON.parse(fs.readFileSync(votosPorIpPath));

// Funciones para guardar los datos
const guardarVotos = (votos) => {
  console.log("Guardando votos:", votos);  // Verificamos los votos antes de guardar
  fs.writeFileSync(votosPath, JSON.stringify(votos, null, 2));
};

const guardarIps = (ipsSet) => fs.writeFileSync(ipsPath, JSON.stringify([...ipsSet], null, 2));
const guardarFingerprints = (fpSet) => fs.writeFileSync(fingerprintsPath, JSON.stringify([...fpSet], null, 2));
const guardarVotosPorIp = (data) => fs.writeFileSync(votosPorIpPath, JSON.stringify(data, null, 2));

// Cargar los votos solo una vez cuando se inicia el servidor
let votos = getVotos();

// Socket
io.on('connection', (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const ips = getIps();
  const fingerprints = getFingerprints();
  const votosPorIp = getVotosPorIp();
  const hoy = new Date().toISOString().slice(0, 10);

  // Emitir votos al cliente cuando se conecta
  socket.emit('updateVotes', { votos });

  socket.on('vote', ({ candidato, fingerprint }) => {
    // Verificar que no se haya votado desde esta IP o fingerprint hoy
    if (
      ips.has(ip) ||
      fingerprints.has(fingerprint) ||
      votosPorIp[ip] === hoy
    ) {
      console.log(`❌ Voto bloqueado. IP: ${ip}, FP: ${fingerprint}, Fecha: ${hoy}`);
      return;
    }

    // Asegurarse de que el candidato sea válido
    if (typeof candidato === 'string' && votos.hasOwnProperty(candidato)) {
      votos[candidato]++;
      ips.add(ip);
      fingerprints.add(fingerprint);
      votosPorIp[ip] = hoy;

      // Guardar votos solo cuando haya un cambio
      guardarVotos(votos);
      guardarIps(ips);
      guardarFingerprints(fingerprints);
      guardarVotosPorIp(votosPorIp);

      io.emit('updateVotes', { votos });
      console.log(`✅ Voto registrado. Candidato: ${candidato}, IP: ${ip}`);
    }
  });
});

// Rutas
app.get('/admin-votos-2025', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privado', 'resultados.html'));
});

app.get('/admin-resetear-ips', (req, res) => {
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

