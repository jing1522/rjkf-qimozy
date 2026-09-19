(function () {
  const STORAGE_KEY = 'survey_records';

  const readRecords = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === null ? [] : JSON.parse(raw);
    } catch (error) {
      return [];
    }
  };

  const writeRecords = (records) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  };

  const setStatus = (text, type) => {
    $('#survey-status').removeClass('alert-success alert-danger').addClass(type).text(text).show();
  };

  const emailOk = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const renderRecords = () => {
    const records = readRecords();
    const $body = $('#records-body');
    $body.empty();

    if (records.length === 0) {
      $body.append('<tr><td colspan="6" class="text-muted">还没有记录，填一份提交试试。</td></tr>');
    } else {
      records.map((record, index) => ({ record: record, index: index })).reverse().forEach(item => {
        const record = item.record;
        const stages = (record.stages || []).join('、') || '—';
        $body.append(
          '<tr>' +
          '<td>' + (record.name || '—') + '</td>' +
          '<td>' + (record.grade || '—') + '</td>' +
          '<td>' + (record.ai || '—') + '</td>' +
          '<td>' + stages + '</td>' +
          '<td>' + (record.time || '—') + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-outline-danger del-record" data-index="' + item.index + '">删除</button></td>' +
          '</tr>'
        );
      });
    }

    $('#survey-count').text('这台电脑上已保存 ' + records.length + ' 份记录（保存在浏览器本地，不会上传）。');
    $('#records-clear').prop('disabled', records.length === 0);
  };

  $('#survey-form').on('submit', function (event) {
    event.preventDefault();

    const name = $('#s-name').val().trim();
    const mail = $('#s-mail').val().trim();
    const grade = $('#s-grade').val();

    if (name === '') {
      setStatus('名字不能为空，先填一下称呼吧。', 'alert-danger');
      return;
    }
    if (!emailOk(mail)) {
      setStatus('邮箱格式好像不对，检查一下。', 'alert-danger');
      return;
    }
    if (grade === '') {
      setStatus('还没选年级，选好再提交。', 'alert-danger');
      return;
    }

    const stages = [];
    $('#survey-form input[name="stage"]:checked').each(function () {
      stages.push($(this).val());
    });

    const records = readRecords();
    records.push({
      name: name,
      mail: mail,
      grade: grade,
      experience: $('#survey-form input[name="experience"]:checked').val() || '',
      stages: stages,
      ai: $('#s-ai').val(),
      payment: $('#survey-form input[name="payment"]:checked').val() || '',
      advice: $('#s-advice').val().trim(),
      time: new Date().toLocaleString()
    });

    try {
      writeRecords(records);
    } catch (error) {
      setStatus('保存失败：本地存储不可用，可以清一点空间再试。', 'alert-danger');
      return;
    }

    this.reset();
    renderRecords();
    setStatus('已保存，谢谢你的填写！下面表格里能看到这条记录。', 'alert-success');
  });

  $('#records-body').on('click', '.del-record', function () {
    const index = Number($(this).data('index'));
    const records = readRecords();
    if (index < 0 || index >= records.length) {
      return;
    }
    const removed = records.splice(index, 1)[0];
    try {
      writeRecords(records);
    } catch (error) {
      setStatus('删除失败：本地存储不可用。', 'alert-danger');
      return;
    }
    renderRecords();
    setStatus('已删除一条记录：' + (removed.name || '未署名') + '。', 'alert-success');
  });

  $('#records-clear').on('click', function () {
    if (readRecords().length === 0) {
      return;
    }
    if (!window.confirm('确定要清空这台电脑上保存的全部问卷记录吗？')) {
      return;
    }
    try {
      writeRecords([]);
    } catch (error) {
      setStatus('清空失败：本地存储不可用。', 'alert-danger');
      return;
    }
    renderRecords();
    setStatus('已经清空全部记录。', 'alert-success');
  });

  renderRecords();
})();
