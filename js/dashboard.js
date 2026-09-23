(function () {
  const DATA_URLS = { actual: 'data/prep.json', plan: 'data/plan.json' };
  const PALETTE = ['#164a8a', '#f97316', '#6c9bd1'];
  const HINT_DEFAULT = '提示：点柱状图里的柱子，折线图会只显示那一类（再点一次恢复）。';

  const state = {
    actual: null,
    actualRaw: null,
    plan: null,
    source: 'actual',
    focus: null,
    editing: null,
    filter: { category: '', from: 0, to: 0, keyword: '' }
  };

  let barChart = null;
  let lineChart = null;
  let pieChart = null;

  const STORAGE_KEY = 'prep_records';

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const readSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === null ? null : JSON.parse(raw);
    } catch (error) {
      return null;
    }
  };

  const writeSaved = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  };

  const setStatus = (text, type) => {
    $('#prep-status').removeClass('alert-warning alert-success alert-danger').addClass(type).text(text).show();
  };

  const setManageStatus = (text, type) => {
    $('#manage-status').removeClass('alert-warning alert-success alert-danger').addClass(type).text(text).show();
  };

  const loadJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.json();
  };

  const currentData = () => (state.source === 'plan' ? state.plan : state.actual);

  const findSeries = (data, category) => data.series.filter(s => s.category === category)[0] || null;

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

  const applyRecord = (weekIndex, category, hours) => {
    const series = findSeries(state.actual, category);
    const oldValue = series.counts[weekIndex];
    series.counts[weekIndex] = hours;
    if (writeSaved(state.actual)) {
      return true;
    }
    series.counts[weekIndex] = oldValue;
    return false;
  };

  const resetRecordForm = () => {
    state.editing = null;
    $('#record-category').val('');
    $('#record-week').val('');
    $('#record-hours').val('');
    $('#record-submit').text('保存记录');
    $('#record-cancel').hide();
  };

  const renderManage = () => {
    const data = state.actual;
    if (data === null) {
      return;
    }
    const rows = [];
    data.weeks.forEach((week, i) => {
      data.series.forEach(s => {
        if (s.counts[i] > 0) {
          rows.push({ week: week, weekIndex: i, category: s.category, count: s.counts[i] });
        }
      });
    });

    $('#manage-body').empty();
    if (rows.length === 0) {
      $('#manage-body').append('<tr><td colspan="4" class="text-muted">现在一条记录都没有，在上面填一条试试。</td></tr>');
    } else {
      rows.forEach(r => {
        $('#manage-body').append(
          '<tr>' +
          '<td>' + r.week + '</td>' +
          '<td>' + r.category + '</td>' +
          '<td>' + r.count + ' ' + data.unit + '</td>' +
          '<td>' +
          '<button type="button" class="btn btn-sm btn-outline-secondary edit-record" data-week="' + r.weekIndex + '" data-category="' + r.category + '">修改</button> ' +
          '<button type="button" class="btn btn-sm btn-outline-danger del-record-row" data-week="' + r.weekIndex + '" data-category="' + r.category + '">删除</button>' +
          '</td>' +
          '</tr>'
        );
      });
    }

    const total = rows.reduce((sum, r) => sum + r.count, 0);
    $('#manage-hint').text('当前共 ' + rows.length + ' 条记录，合计 ' + total + ' ' + data.unit + '；删掉一条等于把那一格清零，明细表里会显示 0。');
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
    $('#record-category').empty().append('<option value="">选择方向</option>');
    data.series.forEach(s => {
      $('#record-category').append('<option value="' + s.category + '">' + s.category + '</option>');
    });
    $('#record-week').empty().append('<option value="">选择周次</option>');
    data.weeks.forEach((week, i) => {
      $('#record-week').append('<option value="' + i + '">' + week + '</option>');
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
      state.actualRaw = clone(actual);
      const saved = readSaved();
      state.actual = (saved !== null && saved.series && saved.series.length === actual.series.length) ? saved : clone(actual);
      state.plan = plan;
      state.source = 'actual';
      fillFilterOptions(state.actual);
      renderAll();
      renderManage();
      setStatus(
        saved === null
          ? '数据加载完成：两份 JSON 并行加载用时 ' + ms.toFixed(0) + ' ms'
          : '数据加载完成：两份 JSON 并行加载用时 ' + ms.toFixed(0) + ' ms（读到本机保存的修改，点「恢复初始数据」可回到原样）',
        'alert-success'
      );
    } catch (error) {
      setStatus('加载失败：' + error.message + '（检查 data/prep.json 与 data/plan.json 是否存在，以及本地服务器有没有开着）', 'alert-danger');
    }
  };

  $('#source-switch').on('click', 'button', function () {
    state.source = $(this).data('source') === 'plan' ? 'plan' : 'actual';
    $('#source-switch button').removeClass('btn-accent').addClass('btn-outline-secondary');
    $(this).removeClass('btn-outline-secondary').addClass('btn-accent');
    renderAll();
    $('#manage-card').toggle(state.source === 'actual');
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

  $('#record-form').on('submit', function (event) {
    event.preventDefault();
    if (state.actual === null) {
      setManageStatus('数据还没加载完，等一下再试。', 'alert-danger');
      return;
    }

    const category = $('#record-category').val();
    const weekValue = $('#record-week').val();
    const hoursText = $('#record-hours').val().trim();

    if (category === '') {
      setManageStatus('先选一个方向。', 'alert-danger');
      return;
    }
    if (weekValue === '') {
      setManageStatus('先选一个周次。', 'alert-danger');
      return;
    }
    if (hoursText === '') {
      setManageStatus('时长还没填，写一个大于 0、不超过 24 的数字。', 'alert-danger');
      return;
    }
    const hours = Number(hoursText);
    if (!isFinite(hours) || hours <= 0 || hours > 24) {
      setManageStatus('时长要填大于 0、不超过 24 的数字，最多一位小数，不要带单位。', 'alert-danger');
      return;
    }

    const weekIndex = Number(weekValue);
    const weekLabel = state.actual.weeks[weekIndex];
    const series = findSeries(state.actual, category);
    const oldValue = series.counts[weekIndex];
    const isEditing = state.editing !== null && state.editing.weekIndex === weekIndex && state.editing.category === category;

    if (!isEditing && oldValue > 0) {
      setManageStatus('「' + category + '」在「' + weekLabel + '」已经有 ' + oldValue + ' ' + state.actual.unit + '了，点那一行的「修改」来改它。', 'alert-danger');
      return;
    }

    const value = Math.round(hours * 10) / 10;
    if (!applyRecord(weekIndex, category, value)) {
      setManageStatus('保存失败：本地存储不可用，可以清一点空间再试。', 'alert-danger');
      return;
    }

    resetRecordForm();
    renderAll();
    renderManage();
    setManageStatus(
      isEditing
        ? '已经改好：「' + category + '」' + weekLabel + ' 现在是 ' + value + ' ' + state.actual.unit + '。'
        : '已经加了一条：「' + category + '」' + weekLabel + '，' + value + ' ' + state.actual.unit + '。',
      'alert-success'
    );
  });

  $('#manage-body').on('click', '.edit-record', function () {
    const weekIndex = Number($(this).attr('data-week'));
    const category = $(this).attr('data-category');
    const series = findSeries(state.actual, category);
    state.editing = { weekIndex: weekIndex, category: category };
    $('#record-category').val(category);
    $('#record-week').val(weekIndex);
    $('#record-hours').val(series.counts[weekIndex]);
    $('#record-submit').text('保存修改');
    $('#record-cancel').show();
    setManageStatus('正在修改：「' + category + '」' + state.actual.weeks[weekIndex] + '。改完点「保存修改」。', 'alert-warning');
  });

  $('#manage-body').on('click', '.del-record-row', function () {
    const weekIndex = Number($(this).attr('data-week'));
    const category = $(this).attr('data-category');
    const removed = findSeries(state.actual, category).counts[weekIndex];
    if (!applyRecord(weekIndex, category, 0)) {
      setManageStatus('删除失败：本地存储不可用，可以清一点空间再试。', 'alert-danger');
      return;
    }
    if (state.editing !== null && state.editing.weekIndex === weekIndex && state.editing.category === category) {
      resetRecordForm();
    }
    renderAll();
    renderManage();
    setManageStatus('已删除：「' + category + '」' + state.actual.weeks[weekIndex] + ' 原来记的 ' + removed + ' ' + state.actual.unit + '，那一格清零、明细表里显示 0。', 'alert-success');
  });

  $('#record-cancel').on('click', function () {
    resetRecordForm();
    setManageStatus('取消修改，表单已经清空。', 'alert-warning');
  });

  $('#record-reset').on('click', function () {
    if (state.actualRaw === null) {
      return;
    }
    if (!window.confirm('确定丢弃本机保存的修改，恢复成 data/prep.json 的原样吗？')) {
      return;
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      setManageStatus('恢复失败：本地存储不可用。', 'alert-danger');
      return;
    }
    state.actual = clone(state.actualRaw);
    resetRecordForm();
    fillFilterOptions(state.actual);
    renderAll();
    renderManage();
    setManageStatus('已恢复成 data/prep.json 里的原始数据。', 'alert-success');
  });

  window.addEventListener('resize', () => {
    if (barChart) barChart.resize();
    if (pieChart) pieChart.resize();
  });

  loadData();
})();
