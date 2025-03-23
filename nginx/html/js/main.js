// Переменные для данных
let factData = [];
let forecastData = [];
let dataIndex = {};
let uniqueDays = [];

window.overlayVisible = true; // чтобы quotes.js мог проверять — показывать цитаты или нет

// Функция для сокращённого отображения больших чисел
function formatValueShort(value) {
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) {
    return sign + (absValue / 1e9).toLocaleString('ru-RU', {
      maximumFractionDigits: 3,
      minimumFractionDigits: 3
    }) + ' млрд';
  } else if (absValue >= 1e6) {
    return sign + (absValue / 1e6).toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    }) + ' млн';
  } else if (absValue >= 1e3) {
    return sign + (absValue / 1e3).toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    }) + ' тыс';
  } else {
    return sign + absValue.toFixed(2);
  }
}

// Загрузка данных (пример: fact и forecast)
function loadData() {
  return Promise.all([
    fetch('/fact').then(res => res.json()),
    fetch('/forecast').then(res => res.json())
  ])
  .then(([fact, forecast]) => {
    factData = fact;
    forecastData = forecast;
  })
  .catch(error => console.error("Ошибка загрузки данных:", error));
}

// Предварительно строим индекс по дням-ресторанам
function buildDataIndex() {
  const daysSet = new Set();

  function safeAssign(day, rest) {
    if (!dataIndex[day]) dataIndex[day] = {};
    if (!dataIndex[day][rest]) {
      dataIndex[day][rest] = {
        fact_check: 0,
        fact_sales: 0,
        forecast_check: 0,
        forecast_sales: 0,
        address: 'неизвестно'
      };
    }
    daysSet.add(day);
  }

  factData.forEach(row => {
    const day = row.day_id;
    const rest = String(row.rest_id);
    safeAssign(day, rest);
    dataIndex[day][rest].fact_check += (row.check_qnty || 0);
    dataIndex[day][rest].fact_sales += (row.sales || 0);

    if (row.address) {
      dataIndex[day][rest].address = row.address;
    }
  });

  forecastData.forEach(row => {
    const day = row.day_id;
    const rest = String(row.rest_id);
    safeAssign(day, rest);
    dataIndex[day][rest].forecast_check += (row.check_qnty || 0);
    dataIndex[day][rest].forecast_sales += (row.sales || 0);

    if (row.address) {
      dataIndex[day][rest].address = row.address;
    }
  });

  uniqueDays = Array.from(daysSet).sort();
}

// Инициализация списка ресторанов (в сайдбаре)
function initRestaurantList() {
  const uniqueRests = {};
  for (const day in dataIndex) {
    for (const restId in dataIndex[day]) {
      if (!uniqueRests[restId]) {
        uniqueRests[restId] = dataIndex[day][restId].address || 'неизвестно';
      }
    }
  }
  const container = document.getElementById('restaurantList');
  container.innerHTML = '';
  Object.keys(uniqueRests).forEach(rid => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" class="restaurant-checkbox" value="${rid}">
      ${rid} - ${uniqueRests[rid]}
    `;
    container.appendChild(label);
  });
}

// Дебаунс-функция, чтобы не искать каждый символ
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Фильтруем дни по выбранному диапазону
function filterDaysByRange(days, start, end) {
  if (!start || !end) return days;
  return days.filter(d => {
    const dayMoment = moment(d, 'YYYY-MM-DD');
    return dayMoment.isBetween(start, end, null, '[]');
  });
}

// Ежедневная агрегация (для нескольких графиков)
function combineData(selectedRests, metric, startDate, endDate) {
  const filteredDays = filterDaysByRange(uniqueDays, startDate, endDate);
  const result = [];
  filteredDays.forEach(day => {
    if (!dataIndex[day]) return;
    let totalFact = 0;
    let totalForecast = 0;
    let totalAbsError = 0;

    Object.keys(dataIndex[day]).forEach(restId => {
      if (selectedRests.length > 0 && !selectedRests.includes(restId)) return;

      const entry = dataIndex[day][restId];
      const factVal = (metric === 'check_qnty') ? entry.fact_check : entry.fact_sales;
      const forecastVal = (metric === 'check_qnty') ? entry.forecast_check : entry.forecast_sales;

      totalFact += factVal;
      totalForecast += forecastVal;
      totalAbsError += Math.abs(factVal - forecastVal);
    });

    let errorPercent = 0;
    if (totalFact !== 0) {
      errorPercent = (totalAbsError / totalFact) * 100;
    }

    result.push({
      day_id: day,
      fact: totalFact,
      forecast: totalForecast,
      delta: totalFact - totalForecast,
      errorPercent: errorPercent
    });
  });
  return result.sort((a, b) => (a.day_id > b.day_id ? 1 : -1));
}

// Месячная агрегация для KPI
function combineMonthlyData(selectedRests, metric, startDate, endDate) {
  const filteredDays = filterDaysByRange(uniqueDays, startDate, endDate);
  const monthlyData = {};

  filteredDays.forEach(day => {
    if (!dataIndex[day]) return;
    const month = moment(day, 'YYYY-MM-DD').format('YYYY-MM');

    if (!monthlyData[month]) {
      monthlyData[month] = { fact: 0, forecast: 0 };
    }

    Object.keys(dataIndex[day]).forEach(restId => {
      if (selectedRests.length > 0 && !selectedRests.includes(restId)) return;

      const entry = dataIndex[day][restId];
      const factVal = (metric === 'check_qnty') ? entry.fact_check : entry.fact_sales;
      const forecastVal = (metric === 'check_qnty') ? entry.forecast_check : entry.forecast_sales;

      monthlyData[month].fact     += factVal;
      monthlyData[month].forecast += forecastVal;
    });
  });

  return Object.keys(monthlyData).sort().map(month => {
    const fact = monthlyData[month].fact;
    const forecast = monthlyData[month].forecast;
    const delta = fact - forecast;
    const errorPercent = fact !== 0 ? (Math.abs(delta) / fact) * 100 : 0;
    return { month, fact, forecast, delta, errorPercent };
  });
}

// Распределение ошибки (0–10%, 10–20%, …)
function getErrorDistribution(selectedRests, metric, startDate, endDate) {
  const filteredDays = filterDaysByRange(uniqueDays, startDate, endDate);

  const days = [];
  const distribution = []; // для каждой даты массив из 5 bin'ов

  filteredDays.forEach(day => {
    if (!dataIndex[day]) return;

    // Корзины: 0-10%, 10-20%, 20-30%, 30-40%, >40%
    let binCounts = [0, 0, 0, 0, 0];
    let totalCount = 0;

    for (const restId in dataIndex[day]) {
      if (selectedRests.length > 0 && !selectedRests.includes(restId)) continue;

      const entry = dataIndex[day][restId];
      const factVal = (metric === 'check_qnty') 
        ? entry.fact_check 
        : entry.fact_sales;
      const forecastVal = (metric === 'check_qnty')
        ? entry.forecast_check
        : entry.forecast_sales;

      if (factVal === 0) {
        continue;
      }

      const errorPercent = Math.abs(factVal - forecastVal) / factVal * 100;
      totalCount++;

      if      (errorPercent < 10) binCounts[0]++;
      else if (errorPercent < 20) binCounts[1]++;
      else if (errorPercent < 30) binCounts[2]++;
      else if (errorPercent < 40) binCounts[3]++;
      else                        binCounts[4]++;
    }

    if (totalCount > 0) {
      binCounts = binCounts.map(count => (count / totalCount) * 100);
    }

    days.push(day);
    distribution.push(binCounts);
  });

  return { days, distribution };
}

// Плотность ошибки (bins) для chartErrorDensity
function getErrorDensity(data) {
  const bins = [0,10,20,30,40,50,60,70,80,90,100];
  const counts = new Array(bins.length - 1).fill(0);
  data.forEach(d => {
    const e = Math.abs(d.errorPercent);
    for (let i = 0; i < bins.length - 1; i++) {
      if (e >= bins[i] && e < bins[i+1]) {
        counts[i]++;
        break;
      }
    }
  });
  const total = data.length || 1;
  return counts.map(c => c / total);
}

// Обновление KPI-графика и итоговых значений
function updateKPIChart(monthlyData) {
  const labels = monthlyData.map(d => d.month);
  const factVals = monthlyData.map(d => d.fact);
  const forecastVals = monthlyData.map(d => d.forecast);

  // Обновляем данные на kpiChart
  kpiChart.data.labels = labels;
  kpiChart.data.datasets[0].data = factVals;
  kpiChart.data.datasets[1].data = forecastVals;
  kpiChart.update();

  // Считаем общие суммы
  const totalFact = factVals.reduce((a, b) => a + b, 0);
  const totalForecast = forecastVals.reduce((a, b) => a + b, 0);

  document.getElementById('factTotal').textContent = formatValueShort(totalFact);
  document.getElementById('forecastTotal').textContent = formatValueShort(totalForecast);

  const wape = totalFact !== 0
    ? (Math.abs(totalFact - totalForecast) / totalFact) * 100
    : 0;

  document.getElementById('wapeMetric').textContent = wape.toFixed(2) + '%';
}

// Обновление всех графиков
function updateAllCharts(data, metric) {
  const labels = data.map(d => d.day_id);
  const errorVals = data.map(d => d.errorPercent);

  // chartErrorByDay
  charts.chartErrorByDay.data.labels = labels;
  charts.chartErrorByDay.data.datasets[0].data = errorVals;
  // Цель меняем в зависимости от метрики
  charts.chartErrorByDay.options.plugins.annotation.annotations.targetLine.value =
    (metric === 'check_qnty' ? 8 : 11);
  charts.chartErrorByDay.update();

  // chartErrorDensity
  const density = getErrorDensity(data);
  charts.chartErrorDensity.data.datasets[0].data = density;
  charts.chartErrorDensity.update();

  // chartFactForecast
  const factVals = data.map(d => d.fact);
  const forecastVals = data.map(d => d.forecast);
  const deltaVals = data.map(d => d.delta);
  charts.chartFactForecast.data.labels = labels;
  charts.chartFactForecast.data.datasets[0].data = factVals;
  charts.chartFactForecast.data.datasets[1].data = forecastVals;
  charts.chartFactForecast.data.datasets[2].data = deltaVals;
  charts.chartFactForecast.update();

  // chartErrorDistribution
  const selectedRests = Array.from(document.querySelectorAll('.restaurant-checkbox:checked'))
                             .map(ch => ch.value);
  const distInfo = getErrorDistribution(selectedRests, metric, selectedStartDate, selectedEndDate);
  charts.chartErrorDistribution.data.labels = distInfo.days;
  for (let i = 0; i < 5; i++) {
    charts.chartErrorDistribution.data.datasets[i].data = distInfo.distribution.map(row => row[i]);
  }
  charts.chartErrorDistribution.update();
}

// Основная функция обновления
function refreshData() {
  const selectedRests = Array.from(document.querySelectorAll('.restaurant-checkbox:checked'))
                             .map(ch => ch.value);

  const toggleChecks = document.getElementById('toggleChecks').checked;
  const toggleSales = document.getElementById('toggleSales').checked;

  // Выбираем метрику (чек/выручка)
  let currentMetric = toggleSales ? 'sales' : 'check_qnty';

  // Ежедневная агрегация
  const combined = combineData(selectedRests, currentMetric, selectedStartDate, selectedEndDate);
  updateAllCharts(combined, currentMetric);

  // Месячная агрегация
  const monthlyCombined = combineMonthlyData(selectedRests, currentMetric, selectedStartDate, selectedEndDate);
  updateKPIChart(monthlyCombined);
}

// Глобальные переменные для дат
let selectedStartDate = null;
let selectedEndDate = null;

// Когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
  // Запускаем показывать цитаты (из quotes.js)
  startQuotes();

  // Загружаем данные
  loadData().then(() => {
    buildDataIndex();
    initRestaurantList();
    initCharts(); // из charts.js

    // Устанавливаем диапазон дат по умолчанию (последние 7 дней)
    const defaultStart = moment().subtract(7, 'days');
    const defaultEnd   = moment();
    selectedStartDate = defaultStart;
    selectedEndDate   = defaultEnd;

    const $dateRange = $('#daterange');
    $dateRange.daterangepicker({
      startDate: defaultStart,
      endDate: defaultEnd,
      opens: 'right',
      autoApply: false,
      locale: {
        format: 'DD.MM.YYYY',
        applyLabel: 'Применить',
        cancelLabel: 'Отмена',
        daysOfWeek: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
        monthNames: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
        firstDay: 1
      }
    }, function(start, end) {
      selectedStartDate = start;
      selectedEndDate = end;
      refreshData();
    });
    // Отображаем выбранный диапазон
    $dateRange.val(defaultStart.format('DD.MM.YYYY') + ' - ' + defaultEnd.format('DD.MM.YYYY'));

    // По умолчанию включаем "чеки"
    const toggleChecks = document.getElementById('toggleChecks');
    const toggleSales = document.getElementById('toggleSales');
    toggleChecks.checked = true;
    toggleSales.checked = false;

    // Логика выбора метрик (чек/выручка)
    toggleChecks.addEventListener('change', () => {
      if (toggleChecks.checked) {
        toggleSales.checked = false;
      } else {
        if (!toggleSales.checked) {
          toggleSales.checked = true;
        }
      }
      refreshData();
    });
    toggleSales.addEventListener('change', () => {
      if (toggleSales.checked) {
        toggleChecks.checked = false;
      } else {
        if (!toggleChecks.checked) {
          toggleChecks.checked = true;
        }
      }
      refreshData();
    });

    // Слушаем чекбоксы ресторанов
    document.getElementById('restaurantList').addEventListener('change', refreshData);

    // Поиск по ресторанам (дебаунс)
    const searchInput = document.getElementById('searchRestaurant');
    const handleSearch = debounce((e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('.restaurant-checkbox').forEach(ch => {
        const label = ch.parentElement.textContent.toLowerCase();
        ch.parentElement.style.display = label.includes(val) ? 'block' : 'none';
      });
    }, 300);
    searchInput.addEventListener('input', handleSearch);

    // Кнопки полноэкранного режима
    document.querySelectorAll('.fullscreen-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openFullscreenChart(btn.getAttribute('data-chart'));
      });
    });

    // Закрыть модалку
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);

    // Финальный рефреш
    refreshData();

    // Скрываем overlay и останавливаем цитаты
    window.overlayVisible = false;
    if (quoteTimer) {
      clearInterval(quoteTimer);
    }
    document.getElementById('loadingOverlay').style.display = 'none';
  });
});
