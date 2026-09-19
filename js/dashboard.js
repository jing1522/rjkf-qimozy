(function () {
  const DATA_URLS = { actual: 'data/prep.json', plan: 'data/plan.json' };
  const PALETTE = ['#164a8a', '#f97316', '#6c9bd1'];
  const HINT_DEFAULT = '提示：点柱状图里的柱子，折线图会只显示那一类（再点一次恢复）。';

  const state = {
    actual: null,
    plan: null,
    source: 'actual',
    focus: null,
    filter: { category: '', from: 0, to: 0, keyword: '' }
  };

  let barChart = null;
  let lineChart = null;
  let pieChart = null;

  const setStatus = (text, type) => {
    $('#prep-status').removeClass('alert-warning alert-success alert-danger').addClass(type).text(text).show();
  };

  const loadJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.json();
  };

  const currentData = () => (state.source === 'plan' ? state.plan : state.actual);

  const inRange = (index) => index >= state.filter.from && index <= state.filter.to;

  const keepCategory = (category) => state.filter.category === '' || category === state.filter.category;

  const view = () => {
    const data = currentData();
    if (data === null) {
      return null;
    }
    return {
      title: data.title,
      source: data.source,
      unit: data.unit,
      weeks: data.weeks.filter((week, i) => inRange(i)),
      series: data.series
        .filter(s => keepCategory(s.category))
        .map(s => ({ category: s.category, counts: s.counts.filter((n, i) => inRange(i)) }))
    };
  };

  const renderCards = (data) => {
    $('#cards').empty();
    data.series.forEach(s => {
      const total = s.counts.reduce((sum, n) => sum + n, 0);
      const avg = (total / data.weeks.length).toFixed(1);
      $('#cards').append(`
        <div class="col-12 col-md-4">
          <div class="card entry-card h-100">
            <div class="card-body">
              <h3 class="card-title h6">${s.category}</h3>
              <p class="card-text fs-4 mb-1">${total} <span class="fs-6 text-muted">${data.unit}</span></p>
              <p class="card-text small text-muted mb-0">当前范围共 ${data.weeks.length} 周，平均每周 ${avg} ${data.unit}</p>
            </div>
          </div>
        </div>
      `);
    });
  };

  const renderBarChart = (data) => {
    if (barChart === null) {
      barChart = echarts.init(document.querySelector('#bar-chart'));
      barChart.on('click', params => toggleFocus(params.seriesName));
    }
    barChart.setOption({
      color: PALETTE,
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      xAxis: { data: data.weeks },
      yAxis: { name: data.unit },
      series: data.series.map(s => ({ name: s.category, type: 'bar', data: s.counts }))
    });
  };

  const renderLineChart = (data) => {
    if (lineChart !== null) {
      lineChart.destroy();
    }
    lineChart = new Chart(document.querySelector('#line-chart'), {
      type: 'line',
      data: {
        labels: data.weeks,
        datasets: data.series.map((s, i) => ({
          label: s.category,
          data: s.counts,
          borderColor: PALETTE[i % PALETTE.length],
          backgroundColor: PALETTE[i % PALETTE.length],
          borderWidth: 2,
          tension: 0.3
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: data.unit } }
        }
      }
    });
  };

  const renderPieChart = (data) => {
    if (pieChart === null) {
      pieChart = echarts.init(document.querySelector('#pie-chart'));
    }
    const rows = data.series.map(s => ({
      name: s.category,
      value: s.counts.reduce((sum, n) => sum + n, 0)
    }));
    pieChart.setOption({
      color: PALETTE,
      tooltip: { trigger: 'item', formatter: p => p.name + '：' + p.value + ' ' + data.unit + '（' + p.percent.toFixed(1) + '%）' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: '55%',
        center: ['50%', '45%'],
        data: rows,
        label: { formatter: p => p.name + '\n' + p.percent.toFixed(1) + '%', fontSize: 11, lineHeight: 14, overflow: 'break', width: 76 },
        labelLine: { length: 8, length2: 8 }
      }]
    });
  };

  const renderTable = () => {
    const data = currentData();
    if (data === null) {
      return;
    }
    const keyword = state.filter.keyword;
    const rows = [];
    data.weeks.forEach((week, i) => {
      if (!inRange(i)) {
        return;
      }
      data.series.forEach(s => {
        if (!keepCategory(s.category)) {
          return;
        }
        if (keyword !== '' && week.indexOf(keyword) < 0 && s.category.indexOf(keyword) < 0) {
          return;
        }
        rows.push({ week: week, category: s.category, count: s.counts[i] });
      });
    });

    $('#detail-body').empty();
    if (rows.length === 0) {
      $('#detail-body').append('<tr><td colspan="3" class="text-muted">没有符合条件的数据，把筛选条件放宽一点再试。</td></tr>');
    } else {
      rows.forEach(r => {
        $('#detail-body').append(
          '<tr><td>' + r.week + '</td><td>' + r.category + '</td><td>' + r.count + ' ' + data.unit + '</td></tr>'
        );
      });
    }

    const weekCount = data.weeks.filter((week, i) => inRange(i)).length;
    const categoryCount = data.series.filter(s => keepCategory(s.category)).length;
    $('#filter-hint').text(
      '明细表当前显示 ' + rows.length + ' 条：' + categoryCount + ' 个方向 × ' + weekCount + ' 周。'
    );
  };

  const toggleFocus = (name) => {
    state.focus = state.focus === name ? null : name;
    lineChart.data.datasets.forEach(d => {
      d.hidden = state.focus !== null && d.label !== state.focus;
    });
    lineChart.update();
    $('#focus-hint').text(
      state.focus === null
        ? HINT_DEFAULT
        : '已联动：折线图只显示「' + state.focus + '」（再点一次恢复）。'
    );
  };

  const renderAll = () => {
    const data = view();
    if (data === null) {
      return;
    }
    state.focus = null;
    $('#focus-hint').text(HINT_DEFAULT);
    $('#prep-sub').text(data.title + ' · 数据来源：' + data.source);
    renderCards(data);
    renderBarChart(data);
    renderLineChart(data);
    renderPieChart(data);
    renderTable();
  };

  const fillFilterOptions = (data) => {
    $('#filter-category').empty().append('<option value="">全部方向</option>');
    $('#filter-from').empty();
    $('#filter-to').empty();
    data.series.forEach(s => {
      $('#filter-category').append('<option value="' + s.category + '">' + s.category + '</option>');
    });
    data.weeks.forEach((week, i) => {
      $('#filter-from').append('<option value="' + i + '">' + week + '</option>');
      $('#filter-to').append('<option value="' + i + '">' + week + '</option>');
    });
    state.filter.category = '';
    state.filter.keyword = '';
    state.filter.from = 0;
    state.filter.to = data.weeks.length - 1;
    $('#filter-category').val('');
    $('#filter-keyword').val('');
    $('#filter-from').val(state.filter.from);
    $('#filter-to').val(state.filter.to);
  };

  const loadData = async () => {
    setStatus('加载中...', 'alert-warning');
    try {
      const start = performance.now();
      const [actual, plan] = await Promise.all([loadJson(DATA_URLS.actual), loadJson(DATA_URLS.plan)]);
      const ms = performance.now() - start;
      if (actual.series.length === 0) {
        setStatus('暂无数据：data/prep.json 里还没有记录。', 'alert-warning');
        return;
      }
      state.actual = actual;
      state.plan = plan;
      state.source = 'actual';
      fillFilterOptions(actual);
      renderAll();
      setStatus('数据加载完成：两份 JSON 并行加载用时 ' + ms.toFixed(0) + ' ms', 'alert-success');
    } catch (error) {
      setStatus('加载失败：' + error.message + '（检查 data/prep.json 与 data/plan.json 是否存在，以及本地服务器有没有开着）', 'alert-danger');
    }
  };

  $('#source-switch').on('click', 'button', function () {
    state.source = $(this).data('source') === 'plan' ? 'plan' : 'actual';
    $('#source-switch button').removeClass('btn-accent').addClass('btn-outline-secondary');
    $(this).removeClass('btn-outline-secondary').addClass('btn-accent');
    renderAll();
  });

  $('#filter-category').on('change', function () {
    state.filter.category = $(this).val();
    renderAll();
  });

  $('#filter-from, #filter-to').on('change', function () {
    let from = Number($('#filter-from').val());
    let to = Number($('#filter-to').val());
    if (from > to) {
      if (this.id === 'filter-from') {
        to = from;
        $('#filter-to').val(to);
      } else {
        from = to;
        $('#filter-from').val(from);
      }
    }
    state.filter.from = from;
    state.filter.to = to;
    renderAll();
  });

  $('#filter-keyword').on('input', function () {
    state.filter.keyword = $(this).val().trim();
    renderTable();
  });

  $('#filter-reset').on('click', function () {
    const data = currentData();
    if (data === null) {
      return;
    }
    state.filter.category = '';
    state.filter.keyword = '';
    state.filter.from = 0;
    state.filter.to = data.weeks.length - 1;
    $('#filter-category').val('');
    $('#filter-keyword').val('');
    $('#filter-from').val(state.filter.from);
    $('#filter-to').val(state.filter.to);
    renderAll();
  });

  window.addEventListener('resize', () => {
    if (barChart) barChart.resize();
    if (pieChart) pieChart.resize();
  });

  loadData();
})();
