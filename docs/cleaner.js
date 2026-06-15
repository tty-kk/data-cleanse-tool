// cleaner.js - 数据清洗增强功能
// ===== 撤销/重做(10步) =====
var redoStack = [];
var maxHistory = 10;

function saveHistory() {
  history.push(JSON.stringify(currentData));
  if (history.length > maxHistory) history.shift();
  redoStack = [];
}

function undoLast() {
  if (history.length === 0) { showToast('没有可撤销的操作', 'error'); return; }
  redoStack.push(JSON.stringify(currentData));
  currentData = JSON.parse(history.pop());
  renderTable(currentData); updateStats();
  showToast('已撤销 (还可撤销 ' + history.length + ' 步)', 'success');
}

function redoLast() {
  if (redoStack.length === 0) { showToast('没有可重做的操作', 'error'); return; }
  saveHistory();
  currentData = JSON.parse(redoStack.pop());
  renderTable(currentData); updateStats();
  showToast('已重做', 'success');
}

function updateStats() {
  document.getElementById('rowCount').textContent = currentData.length;
  if (currentData.length > 0) {
    document.getElementById('colCount').textContent = Object.keys(currentData[0]).length;
    var nulls = 0;
    currentData.forEach(function(r) { Object.keys(r).forEach(function(k) { if (r[k]===''||r[k]===null||r[k]===undefined) nulls++; }); });
    document.getElementById('nullCount').textContent = nulls;
  }
}

// ===== 面板切换 =====
function openCleanTool(type) {
  var panel = document.getElementById('cleanToolPanel');
  var maps = {
    basic: '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;">'
      + '<div class="tool-card" onclick="runDelEmptyRows()"><h3>🗑️ 删空行</h3><p>全空行一键删除</p></div>'
      + '<div class="tool-card" onclick="runDelEmptyCols()"><h3>📭 删空列</h3><p>全空列一键删除</p></div>'
      + '<div class="tool-card" onclick="runFillNulls()"><h3>💧 填充空值</h3><p>指定值填充空单元格</p></div>'
      + '<div class="tool-card" onclick="runTrimAll()"><h3>✂️ 清理空格</h3><p>去除首尾空格</p></div></div>',
    text: '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;">'
      + '<div class="tool-card" onclick="runExtractPhone()"><h3>📱 提取手机号</h3><p>自动提取并去重</p></div>'
      + '<div class="tool-card" onclick="runExtractEmail()"><h3>📧 提取邮箱</h3><p>自动提取并去重</p></div>'
      + '<div class="tool-card" onclick="runWildcardReplace()"><h3>🔤 通配符替换</h3><p>*匹配任意字符批量替换</p></div>'
      + '<div class="tool-card" onclick="runSplitCol()"><h3>✂️ 按分隔符分列</h3><p>拆分列为多列</p></div></div>',
    duplicate: '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;">'
      + '<div class="tool-card" onclick="runHighlightDups()"><h3>🟡 高亮重复</h3><p>导出时带黄色标记</p></div>'
      + '<div class="tool-card" onclick="runDelDup()"><h3>❌ 删除重复</h3><p>移除重复行</p></div>'
      + '<div class="tool-card" onclick="runMarkUnique()"><h3>✅ 标记唯一</h3><p>标记出现一次的值</p></div></div>',
    structure: '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;">'
      + '<div class="tool-card" onclick="runTransposeData()"><h3>🔄 行列转置</h3><p>行和列互换</p></div>'
      + '<div class="tool-card" onclick="runResetIdx()"><h3>🏷️ 重置索引</h3><p>重置行号</p></div></div>'
  };
  panel.innerHTML = maps[type] || '<div style="color:#888;">请选择功能分类</div>';
}

// ===== 基础清洗 =====
function runDelEmptyRows() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  saveHistory();
  currentData = currentData.filter(function(row) {
    for (var k in row) { if (String(row[k]||'').trim() !== '') return true; }
    return false;
  });
  renderTable(currentData); updateStats();
  showToast('空行已删除! 剩余 ' + currentData.length + ' 行', 'success');
}

function runDelEmptyCols() {
  if (!currentData || !currentData.length) { showToast('请先上传文件', 'error'); return; }
  saveHistory();
  var cols = Object.keys(currentData[0]);
  var keep = cols.filter(function(c) { return currentData.some(function(r) { return String(r[c]||'').trim() !== ''; }); });
  currentData = currentData.map(function(r) { var o={}; keep.forEach(function(c) { o[c]=r[c]; }); return o; });
  renderTable(currentData); updateStats();
  showToast('已删除 ' + (cols.length-keep.length) + ' 个空列', 'success');
}

function runFillNulls() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  var v = prompt('空值填充为:', '0'); if (v === null) return;
  saveHistory();
  currentData = currentData.map(function(row) { var r={}; Object.keys(row).forEach(function(k) { r[k]=(row[k]===''||row[k]===null||row[k]===undefined)?v:row[k]; }); return r; });
  renderTable(currentData);
  showToast('空值已填充!', 'success');
}

function runTrimAll() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  saveHistory();
  currentData = currentData.map(function(row) { var r={}; Object.keys(row).forEach(function(k) { r[k]=String(row[k]||'').trim(); }); return r; });
  renderTable(currentData);
  showToast('空格已清理!', 'success');
}

// ===== 文本处理 =====
function runExtractPhone() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  var phones = new Set();
  currentData.forEach(function(row) { Object.keys(row).forEach(function(k) { var m=String(row[k]||'').match(/1[3-9]\d{9}/g); if(m) m.forEach(function(p){phones.add(p);}); }); });
  if (!phones.size) { showToast('未发现手机号', 'error'); return; }
  saveHistory();
  currentData = Array.from(phones).sort().map(function(p) { return {mobile: p}; });
  renderTable(currentData); updateStats();
  showToast('提取到 ' + phones.size + ' 个手机号(已去重)', 'success');
}

function runExtractEmail() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  var emails = new Set();
  currentData.forEach(function(row) { Object.keys(row).forEach(function(k) { var m=String(row[k]||'').match(/[\w.+-]+@[\w-]+\.[\w]{2,}/g); if(m) m.forEach(function(e){emails.add(e.toLowerCase());}); }); });
  if (!emails.size) { showToast('未发现邮箱', 'error'); return; }
  saveHistory();
  currentData = Array.from(emails).sort().map(function(e) { return {email: e}; });
  renderTable(currentData); updateStats();
  showToast('提取到 ' + emails.size + ' 个邮箱(已去重)', 'success');
}

function runWildcardReplace() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  var s = prompt('搜索文本(*匹配任意字符):', ''); if (!s) return;
  var r = prompt('替换为:', ''); if (r === null) return;
  saveHistory();
  try {
    var escaped = s.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    var re = new RegExp('^' + escaped + '$');
    currentData = currentData.map(function(row) { var o={}; Object.keys(row).forEach(function(k) { var v=String(row[k]||''); o[k]=re.test(v)?r:v; }); return o; });
    renderTable(currentData); showToast('替换完成!', 'success');
  } catch(e) { showToast('正则错误: ' + e.message, 'error'); }
}

function runSplitCol() {
  if (!currentData || !currentData.length) { showToast('请先上传文件', 'error'); return; }
  var col = prompt('要拆分的列名:', Object.keys(currentData[0])[0]||''); if (!col) return;
  var sep = prompt('分隔符:', ','); if (!sep) return;
  saveHistory();
  var result = [];
  currentData.forEach(function(row) {
    var parts = String(row[col]||'').split(sep);
    var o = {};
    Object.keys(row).forEach(function(k) { if (k!==col) o[k]=row[k]; });
    parts.forEach(function(p,i) { o[col+'_'+(i+1)]=p.trim(); });
    result.push(o);
  });
  currentData = result;
  renderTable(currentData); updateStats();
  showToast('已拆分为多列', 'success');
}

// ===== 重复值管理 =====
function runHighlightDups() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  var col = prompt('按哪列判断重复?(留空全行):', ''); if (col===null) return;
  saveHistory();
  var seen = {}, dupIdx = {};
  currentData.forEach(function(row, i) {
    var key = col ? String(row[col]||'') : JSON.stringify(row);
    if (seen[key]!==undefined) { dupIdx[i]=true; dupIdx[seen[key]]=true; }
    else seen[key]=i;
  });
  currentData = currentData.map(function(row, i) {
    if (dupIdx[i]) row['_重复标记'] = '⚠️ 重复';
    return row;
  });
  renderTable(currentData);
  showToast('已标记 ' + Object.keys(dupIdx).length + ' 个重复行', 'success');
}

function runDelDup() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  var col = prompt('按哪列去重?(留空全列):', ''); if (col===null) return;
  saveHistory();
  var seen = {};
  currentData = currentData.filter(function(row) {
    var key = col ? String(row[col]||'') : JSON.stringify(row);
    if (seen[key]) return false; seen[key]=true; return true;
  });
  renderTable(currentData); updateStats();
  showToast('去重完成! 剩余 ' + currentData.length + ' 行', 'success');
}

function runMarkUnique() {
  if (!currentData) { showToast('请先上传文件', 'error'); return; }
  var col = prompt('标记哪列的唯一值?', Object.keys(currentData[0])[0]||''); if (!col) return;
  saveHistory();
  var freq = {};
  currentData.forEach(function(r) { var v=String(r[col]||''); freq[v]=(freq[v]||0)+1; });
  currentData.forEach(function(r,i) { r[col+'_唯一标记'] = freq[String(r[col]||'')]===1 ? '✅ 唯一' : '❌ 重复'; });
  renderTable(currentData);
  showToast('标记完成!', 'success');
}

// ===== 结构调整 =====
function runTransposeData() {
  if (!currentData||!currentData.length) { showToast('请先上传文件', 'error'); return; }
  saveHistory();
  var cols = Object.keys(currentData[0]);
  var result = [];
  result.push({col: '列名', values: cols.join(', ')});
  cols.forEach(function(c, ci) {
    var row = {col: c};
    currentData.forEach(function(d, ri) { row['v'+(ri+1)] = String(d[c]||''); });
    result.push(row);
  });
  currentData = result;
  renderTable(currentData); updateStats();
  showToast('行列转置完成!', 'success');
}

function runResetIdx() {
  if (!currentData||!currentData.length) { showToast('请先上传文件', 'error'); return; }
  saveHistory();
  var cols = Object.keys(currentData[0]);
  currentData = currentData.map(function(row, i) {
    var r = {idx: i+1};
    cols.forEach(function(c) { if (c!=='idx') r[c]=row[c]; });
    return r;
  });
  renderTable(currentData); updateStats();
  showToast('索引已重置!', 'success');
}