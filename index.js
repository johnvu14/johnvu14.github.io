const DRAWS_DATA = 'DRAWS_DATA';
const API =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';

Chart.defaults.color = '#fff';

function getRandomColor() {
  const getRandomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const red = getRandomInt(0, 255);
  const green = getRandomInt(0, 255);
  const blue = getRandomInt(0, 255);

  return [red, green, blue];
}

const footer = (items, drawsData) => {
  const drawsByDate = drawsData?.drawsByDate;
  const draw = drawsByDate[items[0]['label']];

  return `#${draw['drawNumber']} - ${draw['drawName']}.`;
};

const getSliceOffset = option => {
  let offset = undefined;

  switch (option) {
    case 'last10Draws':
      offset = 10;
      break;
    case 'last25Draws':
      offset = 25;
      break;
    case 'last50Draws':
      offset = 50;
      break;
    default:
      break;
  }
  return offset === undefined ? undefined : -offset;
};

document.querySelector(
  'footer'
).innerHTML += `&copy; ${new Date().getFullYear()} made by Tan with 💚`;

document.addEventListener('DOMContentLoaded', function () {
  const barColor = getRandomColor();

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
        label: 'Size',
        type: 'bar',
        data: [],
        borderColor: `rgb(${barColor[0]}, ${barColor[1]}, ${barColor[2]})`,
        backgroundColor: `rgb(${barColor[0]}, ${barColor[1]}, ${barColor[2]}, 0.5)`,
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
          text: 'CRS Score Trend Over Time',
        },
        tooltip: {
          callbacks: {
            footer,
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
    { label: 'Last 10 draws', value: 'last10Draws' },
    { label: 'Last 25 draws', value: 'last25Draws' },
    { label: 'Last 50 draws', value: 'last50Draws' },
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

      return 'last10Draws';
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
