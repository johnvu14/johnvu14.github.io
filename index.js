const DRAWS_DATA = 'DRAWS_DATA';
const API =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';

Chart.defaults.color = '#fff';
Chart.defaults.font.weight = 'bold';
Chart.defaults.font.size = '16';

function getRandomBrightColor() {
  const getBrightRandomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1) * 0.7) +
    Math.floor((max - min + 1) * 0.3);

  const red = getBrightRandomInt(100, 255); // Adjust the minimum value to avoid very dark colors
  const green = getBrightRandomInt(100, 255); // Adjust the minimum value to avoid very dark colors
  const blue = getBrightRandomInt(100, 255); // Adjust the minimum value to avoid very dark colors

  return [red, green, blue];
}

const footer = (items, drawsData) => {
  const drawsByDate = drawsData?.drawsByDate;
  const draw = drawsByDate[items[0]['label']];

  return `#${draw['drawNumber']} - ${draw['drawName']}`;
};

const getSliceOffset = option => {
  let offset = undefined;

  switch (option) {
    case 'latest10Draws':
      offset = 10;
      break;
    case 'latest25Draws':
      offset = 25;
      break;
    case 'latest50Draws':
      offset = 50;
      break;
    case 'latest100Draws':
      offset = 100;
      break;
    default:
      break;
  }
  return offset === undefined ? undefined : -offset;
};

document.querySelector(
  'footer'
).innerHTML += `&copy; ${new Date().getFullYear()} <i>made by Tan with</i> 💚`;

document.addEventListener('DOMContentLoaded', function () {
  const barColor = getRandomBrightColor();
  const color = `rgb(${barColor[0]}, ${barColor[1]}, ${barColor[2]})`;

  const data = {
    labels: [],
    datasets: [
      {
        label: 'CRS Score',
        type: 'line',
        data: [],
        borderColor: '#fff',
        borderWidth: 3,
        fill: false,
        yAxisID: 'y-axis-2',
      },
      {
        label: 'Invitations Issued',
        type: 'bar',
        data: [],
        borderColor: color,
        backgroundColor: color,
        fill: false,
        yAxisID: 'y-axis-1',
      },
    ],
  };

  const config = {
    type: 'line',
    data: data,
    stacked: false,
    options: {
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        responsive: true,
        title: {
          display: true,
          text: 'CRS score and size over time',
        },
        tooltip: {
          callbacks: {
            footer,
            labelColor: function (context) {
              return {
                borderColor: 'rgb(0, 0, 0, 0)',
                backgroundColor: 'rgb(0, 0, 0, 0)',
                borderWidth: 1,
                borderRadius: 1,
              };
            },
          },
        },
      },
      scales: {
        y: {
          display: false,
          id: 'y-axis-1',
        },
        y1: {
          display: false,
          id: 'y-axis-2',
        },
      },
    },
  };

  new Chart('my-canvas', config);
});

document.addEventListener('alpine:init', () => {
  const periodOptions = [
    { label: 'Latest 10 draws', value: 'latest10Draws' },
    { label: 'Latest 25 draws', value: 'latest25Draws' },
    { label: 'Latest 50 draws', value: 'latest50Draws' },
    { label: 'Latest 100 draws', value: 'latest100Draws' },
    { label: 'All draws', value: 'allDraws' },
  ];

  Alpine.store(DRAWS_DATA, {
    periodOptions,
    drawsArray: [],
    drawsByDate: {},
    labels: [],
    lineData: [],
    numberOfFetches: 0,
    selectedPeriod: (() => {
      const period = new URL(document.location).searchParams.get('period');

      if (periodOptions.some(option => option['value'] === period)) {
        return period;
      }

      return 'latest10Draws';
    })(),
    init() {
      fetch(API)
        .then(res => res.json())
        .then(data => {
          this.drawsArray = data['rounds'].toReversed();
          this.drawsByDate = this.drawsArray.reduce((map, round) => {
            map[round.drawDate] = round;
            return map;
          }, {});

          this.updateChart(this.selectedPeriod);

          if (++this.numberOfFetches > 1) {
            console.warn('Warning: more than 2 fetches to API!');
          }
        })
        .catch(error => {
          console.error('Error fetching data:', error);
        });
    },
    updateChart(selectedPeriod) {
      const offset = getSliceOffset(selectedPeriod);

      const chart = Chart.getChart('my-canvas');

      const labels = this.drawsArray
        ?.slice(offset)
        ?.map(round => round.drawDate);
      const lineData = this.drawsArray
        ?.slice(offset)
        ?.map(round => round.drawCRS);
      const sizeData = this.drawsArray
        ?.slice(offset)
        ?.map(round => parseInt(round.drawSize.replace(/,/g, '')));
      const newData = { ...chart.data };
      newData.labels = labels;
      newData.datasets[0].data = lineData;
      newData.datasets[1].data = sizeData;
      chart.data = newData;
      chart.options.plugins.tooltip.callbacks.footer = items =>
        footer(items, this);

      chart.update();

      const url = new URL(window.location);
      url.searchParams.set('period', selectedPeriod);
      window.history.pushState({}, '', url);

      this.selectedPeriod = selectedPeriod;
    },
  });
});
