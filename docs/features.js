// features.js - 一键报表 + 跨文件合并 + 高级公式
// ===== 1. 一键报表生成 =====
function generateReport(type) {
  if (!currentData || !currentData.length) { showToast('请先上传数据', 'error'); return; }
  var cols = Object.keys(currentData[0]);
  var wb = XLSX.utils.book_new();
  var result = [];
  if (type === 'sales') {
    var groups = {};
    currentData.forEach(function(row) {
      var nameCol = cols.find(function(c){ return /产品|商品|名称|品名/.test(c); }) || cols[0];
      var amtCol = cols.find(function(c){ return /金额|销售额|总额|小计/.test(c); }) || cols[cols.length-1];
      var qtyCol = cols.find(function(c){ return /数量/.test(c); }) || '';
      var key = String(row[nameCol] || '其他');
      if (!groups[key]) groups[key] = {name: key, qty: 0, amt: 0};
      groups[key].qty += parseFloat(row[qtyCol]) || 0;
      groups[key].amt += parseFloat(row[amtCol]) || 0;
    });
    result = Object.keys(groups).map(function(k) {
      return { '产品名称': groups[k].name, '销售数量': groups[k].qty, '销售金额': groups[k].amt };
    });
    result.sort(function(a,b){ return b['销售金额'] - a['销售金额']; });
  } else if (type === 'finance') {
    var income = 0, expense = 0;
    currentData.forEach(function(row) {
      var amtCol = cols.find(function(c){ return /金额|收入|支出/.test(c); }) || cols[1];
      var catCol = cols.find(function(c){ return /类别|类型|分类/.test(c); }) || cols[0];
      var amt = parseFloat(row[amtCol]) || 0;
      var cat = String(row[catCol] || '');
      if (/收|入|\+/.test(cat) || cat.includes('收入') || cat.includes('入账')) income += amt;
      else if (/支|出|-/.test(cat) || cat.includes('支出') || cat.includes('费用')) expense += Math.abs(amt);
      else if (amt >= 0) income += amt; else expense += Math.abs(amt);
    });
    result = [
      { '财务项目': '总收入', '金额': income },
      { '财务项目': '总支出', '金额': expense },
      { '财务项目': '结余', '金额': income - expense }
    ];
  } else if (type === 'summary') {
    var groupCol = prompt('按哪列分组统计?', cols[0] || '');
    if (!groupCol) return;
    var valCol = prompt('统计哪列的数值?', cols[cols.length-1] || '');
    if (!valCol) return;
    var groups = {};
    currentData.forEach(function(row) {
      var key = String(row[groupCol] || '其他');
      if (!groups[key]) groups[key] = {group: key, count: 0, sum: 0, min: Infinity, max: -Infinity};
      var v = parseFloat(row[valCol]) || 0;
      groups[key].count++;
      groups[key].sum += v;
      groups[key].min = Math.min(groups[key].min, v);
      groups[key].max = Math.max(groups[key].max, v);
    });
    result = Object.keys(groups).sort().map(function(k) {
      var g = groups[k];
      g.avg = Math.round(g.sum / g.count * 100) / 100;
      g.min = g.min === Infinity ? 0 : g.min;
      g.max = g.max === -Infinity ? 0 : g.max;
      return { '分组': g.group, '计数': g.count, '总和': g.sum, '平均': g.avg, '最小': g.min, '最大': g.max };
    });
  } else if (type === 'filtered') {
    var fc = prompt('按哪列筛选?', cols[0] || '');
    if (!fc) return;
    var fv = prompt('筛选值(留空=非空):', '');
    result = currentData.filter(function(row) {
      if (fv) return String(row[fc] || '') === fv;
      return String(row[fc] || '').trim() !== '';
    });
  }
  var ws = XLSX.utils.json_to_sheet(result);
  XLSX.utils.book_append_sheet(wb, ws, '报表');
  var out = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  downloadBlob(new Blob([out], {type:'application/octet-stream'}), type + '_report.xlsx');
  showToast(type === 'sales' ? '销售报表已生成!' : type === 'finance' ? '财务对账表已生成!' : type === 'summary' ? '汇总报表已生成!' : '筛选结果已导出!', 'success');
}

// ===== 2. 跨文件合并 =====
(function() {
  var input = document.createElement('input');
  input.type = 'file'; input.multiple = true;
  input.accept = '.xlsx,.xls,.csv';
  input.style.display = 'none';
  input.id = 'multiMergeInput';
  input.onchange = function(e) {
    var files = Array.from(e.target.files);
    if (files.length < 2) { showToast('请选择至少2个文件', 'error'); return; }
    showToast('正在合并 ' + files.length + ' 个文件...');
    doMultiMerge(files);
  };
  document.body.appendChild(input);
})();

function doMultiMerge(files) {
  var allData = [];
  var done = 0;
  files.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var wb = XLSX.read(e.target.result, {type:'array'});
        wb.SheetNames.forEach(function(name) {
          var json = XLSX.utils.sheet_to_json(wb.Sheets[name], {defval:''});
          json.forEach(function(r) { r['_来源'] = file.name + '[' + name + ']'; allData.push(r); });
        });
      } catch(err) { showToast('处理失败: ' + file.name, 'error'); }
      done++;
      if (done >= files.length) {
        currentData = allData;
        renderTable(currentData);
        if (typeof updateStats === 'function') updateStats();
        showToast('合并完成! 共 ' + allData.length + ' 行', 'success');
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ===== 3. 高级公式 + 公式解释 =====
function explainFormulaAdvanced() {
  var input = (document.getElementById('explainInput') || {}).value || '';
  if (!input) { showToast('请粘贴公式', 'error'); return; }
  var f = input;
  var html = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:10px;border-radius:6px;margin-bottom:8px;">';
  html += '<strong>公式:</strong> <code>' + escHtml(f) + '</code></div>';
  html += '<div style="background:#f8f9fa;padding:10px;border-radius:6px;line-height:1.8;font-size:13px;">';
  html += '<div><strong>中文解释:</strong></div>';
  if (f.includes('IF')) {
    var ifMatch = f.match(/IF\(([^,]+),([^,]+),([^)]+)\)/);
    if (ifMatch) html += '<div style="margin:4px 0;">\u2022 \u6761\u4ef6\u5224\u65ad: \u5982\u679c <code>' + escHtml(ifMatch[1]) + '</code> \u6210\u7acb</div><div style="margin:4px 0;">\u2022 \u4e3a\u771f\u65f6\u8fd4\u56de: <code>' + escHtml(ifMatch[2]) + '</code></div><div style="margin:4px 0;">\u2022 \u4e3a\u5047\u65f6\u8fd4\u56de: <code>' + escHtml(ifMatch[3]) + '</code></div>';
  }
  if (f.includes('VLOOKUP')) {
    var vl = f.match(/VLOOKUP\(([^,]+),([^,]+),([^,]+),[^)]*\)/);
    if (vl) html += '<div style="margin:4px 0;">\u2022 \u67e5\u627e\u503c: <code>' + escHtml(vl[1]) + '</code></div><div style="margin:4px 0;">\u2022 \u67e5\u627e\u8303\u56f4: <code>' + escHtml(vl[2]) + '</code></div><div style="margin:4px 0;">\u2022 \u8fd4\u56de\u7b2c\u51e0\u5217: ' + vl[3] + '</div>';
  }
  if (f.includes('XLOOKUP')) {
    html += '<div style="margin:4px 0;">\u2022 \u6570\u636e\u8fdb\u884c\u667a\u80fd\u67e5\u627e\u5339\u914d</div>';
  }
  if (f.includes('SUMIF')) {
    html += '<div style="margin:4px 0;">\u2022 \u6309\u6761\u4ef6\u6c42\u548c\u8fd0\u7b97</div>';
  }
  if (f.includes('COUNTIF')) {
    html += '<div style="margin:4px 0;">\u2022 \u6309\u6761\u4ef6\u8ba1\u6570\u8fd0\u7b97</div>';
  }
  if (f.includes('DATEDIF')) {
    html += '<div style="margin:4px 0;">\u2022 \u65e5\u671f\u5dee\u503c\u8ba1\u7b97</div>';
  }
  html += '</div>';
  var el = document.getElementById('explainText');
  if (el) el.innerHTML = html;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== 公式模板快捷复制 =====
function useTemplate(name) {
  var tpls = {
    if_grade: '=IF(A2>=90,"优秀",IF(A2>=60,"及格","不及格"))',
    vlookup_inv: '=VLOOKUP(A2,单价表!A:B,2,0)',
    sum_if_month: '=SUMIFS(C:C,A:A,">="&DATE(2024,1,1),A:A,"<="&DATE(2024,1,31))',
    datediff: '=DATEDIF(A2,TODAY(),"Y")&"年"&DATEDIF(A2,TODAY(),"YM")&"月"',
    dedup_count: '=SUMPRODUCT(1/COUNTIF(A:A,A:A))',
    rank_num: '=RANK(A2,$A$2:$A$100)',
    id_extract: '=MID(A2,7,8)',
    status_icon: '=IF(A2="是","✅","❌")'
  };
  var formula = tpls[name] || '';
  var el = document.getElementById('templateFormulaResult');
  if (el) el.textContent = formula;
  if (formula) navigator.clipboard.writeText(formula).then(function(){ showToast('公式已复制!', 'success'); });
}