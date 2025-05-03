const socket = io();

const form = document.getElementById('votacion');
const resultados = document.getElementById('resultados');
const ctx = document.getElementById('grafico').getContext('2d');

const colores = {
  juan: '#ff8c00',       // Movimiento Ciudadano
  reynaldo: '#0066cc',   // PAN
  olivia: '#cc0000',     // PRI
  jorge: '#b71c1c',      // PT
  edwin: '#6d1f7c',      // Morena
  otro: '#808080'        // Independiente
};

let chart;

form.addEventListener('submit', function (e) {
  e.preventDefault();
  const candidato = document.querySelector('input[name="candidato"]:checked');
  if (candidato) {
    socket.emit('vote', candidato.value);
  }
});

socket.on('updateVotes', (votos) => {
  resultados.innerHTML = '';
  const total = Object.values(votos).reduce((a, b) => a + b, 0);

  const labels = [];
  const data = [];
  const backgroundColors = [];

  for (let [nombre, cantidad] of Object.entries(votos)) {
    const porcentaje = total > 0 ? ((cantidad / total) * 100).toFixed(1) : 0;
    const color = colores[nombre] || '#000';

    // Barras
    const bar = document.createElement('div');
    bar.className = 'barra';
    bar.innerHTML = `
      <span>${nombre.toUpperCase()}: ${porcentaje}% (${cantidad} votos)</span>
      <div class="barra-llena" style="width: ${porcentaje}%; background-color: ${color};"></div>
    `;
    resultados.appendChild(bar);

    // Datos para gráfico
    labels.push(nombre.toUpperCase());
    data.push(cantidad);
    backgroundColors.push(color);
  }

  // Gráfico pastel
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = backgroundColors;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: 'Distribución de votos'
          }
        }
      }
    });
  }
});
