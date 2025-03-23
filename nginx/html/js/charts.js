// Плагин для переключения подписей на графике (используется в chartFactForecast)
const toggleDataLabelsPlugin = {
  id: 'toggleDataLabels',
  afterDraw: (chart) => {
    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    ctx.save();
    // Рисуем небольшую “кнопку” с надписью "123" в правом верхнем углу
    const btnX = chartArea.right - 40;
    const btnY = chartArea.top + 10;
    const btnWidth = 30;
    const btnHeight = 20;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('123', btnX + btnWidth / 2, btnY + btnHeight / 2);
    ctx.restore();
  }
};

// Глобальный объект для всех чартов
const charts = {};
let kpiChart;      // KPI-график (отдельно)
let modalChart = null; // график в модальном окне

// Инициализация графиков
function initCharts() {
  // Инициализация KPI графика (месячная агрегация)
  kpiChart = new Chart(document.getElementById('kpiChart'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Факт',
          data: [],
          backgroundColor: 'green',
          borderRadius: 10,
          barThickness: 30
        },
        {
          label: 'Прогноз',
          data: [],
          backgroundColor: 'blue',
          borderRadius: 10,
          barThickness: 30
        }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 20 }
        }
      }
    }
  });

  // График "Ошибка WAPE, % по дням"
  charts.chartErrorByDay = new Chart(document.getElementById('chartErrorByDay'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Ошибка WAPE, %',
        data: [],
        borderColor: 'green',
        backgroundColor: 'rgba(0,255,0,0.1)',
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          title: { display: true, text: 'Ошибка WAPE, %' }
        },
        x: { title: { display: true, text: 'Дата' } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let value = context.parsed.y;
              return 'WAPE: ' + value.toFixed(2) + '%';
            }
          }
        },
        title: {
          display: true,
          text: 'Ошибка WAPE, % по дням'
        },
        annotation: {
          annotations: {
            targetLine: {
              type: 'line',
              scaleID: 'y',
              value: 8, // По умолчанию для чеков
              borderColor: 'red',
              borderDash: [6, 6],
              borderWidth: 2,
              label: {
                enabled: true,
                content: 'Цель'
              }
            }
          }
        }
      }
    }
  });

  // "Плотность ошибки" (пока тестовый пример)
  charts.chartErrorDensity = new Chart(document.getElementById('chartErrorDensity'), {
    type: 'bar',
    data: {
      labels: ['0-10','10-20','20-30','30-40','40-50','50-60','60-70','70-80','80-90','90-100'],
      datasets: [{
        label: 'Плотность ошибки',
        data: [],
        backgroundColor: '#27ae60'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Ошибка, % (корзины)' } },
        y: { beginAtZero: true, title: { display: true, text: 'Плотность' } }
      },
      plugins: {
        title: {
          display: true,
          text: 'Плотность ошибки по корзинам'
        }
      }
    }
  });

  // График "Факт vs Прогноз и дельта"
  charts.chartFactForecast = new Chart(document.getElementById('chartFactForecast'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Факт',
          data: [],
          borderColor: 'green',
          backgroundColor: 'rgba(0,255,0,0.2)',
          fill: false
        },
        {
          label: 'Прогноз',
          data: [],
          borderColor: 'blue',
          backgroundColor: 'rgba(0,0,255,0.2)',
          fill: false
        },
        {
          label: 'Дельта (Факт - Прогноз)',
          type: 'bar',
          data: [],
          backgroundColor: 'rgba(255,99,132,0.5)',
          borderColor: 'rgba(255,99,132,1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: 'Дата' } },
        y: { title: { display: true, text: 'Значение' } }
      },
      plugins: {
        title: {
          display: true,
          text: 'Факт vs Прогноз и дельта'
        },
        datalabels: {
          display: false, // Подписи выключены по умолчанию
          align: 'top',
          color: '#000',
          font: { weight: 'bold' },
          formatter: (value) => formatValueShort(value)
        },
        toggleDataLabels: {} // наш плагин
      }
    },
    plugins: [ChartDataLabels, toggleDataLabelsPlugin]
  });

  // Клик на canvas chartFactForecast для переключения подписей
  document.getElementById('chartFactForecast').addEventListener('click', function(evt) {
    const chart = charts.chartFactForecast;
    const canvasPosition = chart.canvas.getBoundingClientRect();
    const x = evt.clientX - canvasPosition.left;
    const y = evt.clientY - canvasPosition.top;
    const chartArea = chart.chartArea;

    // Проверяем попадание в область "кнопки"
    if (x >= chartArea.right - 40 && x <= chartArea.right - 10 &&
        y >= chartArea.top + 10 && y <= chartArea.top + 30) {
      const currentDisplay = chart.options.plugins.datalabels.display;
      chart.options.plugins.datalabels.display = !currentDisplay;
      chart.update();
    }
  });

  // График распределения ошибки по дням
  charts.chartErrorDistribution = new Chart(document.getElementById('chartErrorDistribution'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        { label: '0-10%',  data: [], backgroundColor: '#2ecc71', stack: 'stack1' },
        { label: '10-20%', data: [], backgroundColor: '#f1c40f', stack: 'stack1' },
        { label: '20-30%', data: [], backgroundColor: '#e67e22', stack: 'stack1' },
        { label: '30-40%', data: [], backgroundColor: '#e74c3c', stack: 'stack1' },
        { label: '>40%',   data: [], backgroundColor: '#8e44ad', stack: 'stack1' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, title: { display: true, text: 'Дата' } },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 100,
          title: { display: true, text: 'Проценты' },
          ticks: { callback: val => val + '%' }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Распределение ошибки по дням'
        }
      }
    }
  });
}

// Функция для открытия графика в полноэкранном модальном окне
function openFullscreenChart(chartId) {
  const modalOverlay = document.getElementById('chartModal');
  const modalCanvas = document.getElementById('modalChartCanvas');
  modalOverlay.style.display = 'flex';

  // Если уже есть активный график в модалке — уничтожаем
  if (modalChart) {
    modalChart.destroy();
  }

  const originalChart = charts[chartId];
  if (!originalChart) return;

  // Копируем конфигурацию из исходного графика
  const newConfig = {
    type: originalChart.config.type,
    data: JSON.parse(JSON.stringify(originalChart.data)),
    options: {
      ...originalChart.config.options,
      responsive: true,
      maintainAspectRatio: false
    },
    plugins: originalChart.config.plugins || []
  };

  modalChart = new Chart(modalCanvas.getContext('2d'), newConfig);

  // Небольшая задержка, чтобы модалка отрисовалась, затем обновим
  setTimeout(() => {
    modalChart.resize();
    modalChart.update();
  }, 100);

  // Аналогичное переключение подписей для chartFactForecast в модальном окне
  if (chartId === 'chartFactForecast') {
    modalCanvas.addEventListener('click', function(evt) {
      const canvasPosition = modalChart.canvas.getBoundingClientRect();
      const x = evt.clientX - canvasPosition.left;
      const y = evt.clientY - canvasPosition.top;
      const chartArea = modalChart.chartArea;

      if (x >= chartArea.right - 40 && x <= chartArea.right - 10 &&
          y >= chartArea.top + 10 && y <= chartArea.top + 30) {
        const currentDisplay = modalChart.options.plugins.datalabels.display;
        modalChart.options.plugins.datalabels.display = !currentDisplay;
        modalChart.update();
      }
    });
  }
}

// Закрытие модального окна
function closeModal() {
  document.getElementById('chartModal').style.display = 'none';
  if (modalChart) {
    modalChart.destroy();
    modalChart = null;
  }
}
