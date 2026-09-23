(function () {
  const DATA_URL = 'data/prep.json';
  const MAX_BAR = 120;
  const STORAGE_KEY = 'prep_records';

  const readSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === null ? null : JSON.parse(raw);
    } catch (error) {
      return null;
    }
  };

  const setStatus = (text, type) => {
    $('#home-status').removeClass('alert-warning alert-success alert-danger').addClass(type).text(text).show();
  };

  const loadJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response.json();
  };

  const weekTotals = (data) => data.weeks.map((week, i) => data.series.reduce((sum, s) => sum + s.counts[i], 0));

  const renderStats = (data, total) => {
    const weekCount = data.weeks.length;
    const avg = weekCount === 0 ? 0 : total / weekCount;
    const items = [
      { label: '总投入', value: total + ' ' + data.unit },
      { label: '备赛周数', value: weekCount + ' 周' },
      { label: '训练方向', value: data.series.length + ' 个' },
      { label: '平均每周', value: avg.toFixed(1) + ' ' + data.unit }
    ];
    $('#home-stats').empty();
    items.forEach(item => {
      $('#home-stats').append(
        '<div class="col-6 col-lg-3">' +
        '<div class="card stat-card h-100"><div class="card-body">' +
        '<p class="stat-label mb-1">' + item.label + '</p>' +
        '<p class="stat-value mb-0">' + item.value + '</p>' +
        '</div></div></div>'
      );
    });
  };

  const renderTimeline = (data) => {
    const totals = weekTotals(data);
    const max = Math.max.apply(null, totals.concat([1]));
    $('#home-timeline').empty();
    data.weeks.forEach((week, i) => {
      const height = Math.max(4, Math.round(totals[i] / max * MAX_BAR));
      $('#home-timeline').append(
        '<div class="timeline-item" title="' + week + '：' + totals[i] + ' ' + data.unit + '">' +
        '<span class="timeline-value">' + totals[i] + '</span>' +
        '<span class="timeline-bar" style="height: ' + height + 'px"></span>' +
        '<span class="timeline-label">' + week.replace('月第', '/').replace('周', '') + '</span>' +
        '</div>'
      );
    });
  };

  const loadData = async () => {
    setStatus('加载中...', 'alert-warning');
    try {
      const fromJson = await loadJson(DATA_URL);
      const saved = readSaved();
      const data = (saved !== null && saved.series && saved.series.length === fromJson.series.length) ? saved : fromJson;
      if (data.series.length === 0) {
        setStatus('暂无数据：data/prep.json 里还没有记录。', 'alert-warning');
        return;
      }
      const total = weekTotals(data).reduce((sum, n) => sum + n, 0);
      renderStats(data, total);
      renderTimeline(data);
      $('#home-source').text('数据来源：' + DATA_URL + '（' + data.source + '）；在这些数字背后，本机改过的记录也算了进去。想改就去「我的准备」页的记录管理里改，或者直接改这个 JSON。');
      setStatus(
        saved === null
          ? '数据加载完成：共 ' + total + ' ' + data.unit + '，来自 ' + DATA_URL
          : '数据加载完成：共 ' + total + ' ' + data.unit + '（含本机保存的修改）',
        'alert-success'
      );
    } catch (error) {
      setStatus('加载失败：' + error.message + '（检查 data/prep.json 是否存在，以及本地服务器有没有开着）', 'alert-danger');
    }
  };

  loadData();
})();
