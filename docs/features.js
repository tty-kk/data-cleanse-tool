// features.js - 加载确认 + 功能模块
// ===== 加载确认 =====
(function(){
  try {
    var el = document.createElement("div");
    el.id = "featuresLoaded";
    el.textContent = "✓ 模块加载";
    el.style.cssText = "position:fixed;bottom:60px;right:24px;background:#10b981;color:#fff;padding:4px 10px;border-radius:4px;font-size:11px;z-index:9999;";
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 4000);
  } catch(e){ console.log("features init:", e); }
})();

// ===== 1. 一键报表 =====
function generateReport(type) {
  try {
    if (!currentData || !currentData.length) { showToast("请先上传数据", "error"); return; }
    var cols = Object.keys(currentData[0]);
    var wb = XLSX.utils.book_new();
    var result = [];
    if (type === "sales") {
      var g = {};
      var nc = colMatch(cols, ["产品","商品","名称","品名"], 0);
      var ac = colMatch(cols, ["金额","销售额","总额","小计"], cols.length-1);
      currentData.forEach(function(r){
        var k = String(r[nc]||"其他");
        if (!g[k]) g[k] = {name:k, qty:0, amt:0};
        g[k].qty += parseFloat(r[colMatch(cols,["数量"],"")] || r[ac]) || 0;
        g[k].amt += parseFloat(r[ac]) || 0;
      });
      var keys = Object.keys(g).sort(function(a,b){ return g[b].amt - g[a].amt; });
      keys.forEach(function(k){ result.push({"产品名称":g[k].name,"数量":g[k].qty,"金额":g[k].amt}); });
    } else if (type === "finance") {
      var inc=0, exp=0;
      var ac2 = colMatch(cols, ["金额","收入","支出"], cols[cols.length-1]);
      currentData.forEach(function(r){
        var a = parseFloat(r[ac2])||0;
        if (a >= 0) inc += a; else exp += Math.abs(a);
      });
      result = [{"项目":"总收入","金额":inc},{"项目":"总支出","金额":exp},{"项目":"结余","金额":inc-exp}];
    } else if (type === "summary") {
      var gc = prompt("按哪列分组?", cols[0]||""); if (!gc) return;
      var vc = prompt("统计哪列?", cols[cols.length-1]||""); if (!vc) return;
      var g2 = {};
      currentData.forEach(function(r){
        var k = String(r[gc]||"其他");
        if (!g2[k]) g2[k] = {g:k, n:0, s:0};
        var v = parseFloat(r[vc])||0;
        g2[k].n++; g2[k].s += v;
      });
      Object.keys(g2).sort().forEach(function(k){
        result.push({"分组":g2[k].g,"计数":g2[k].n,"总和":g2[k].s,"平均":Math.round(g2[k].s/g2[k].n*100)/100});
      });
    }
    var ws = XLSX.utils.json_to_sheet(result);
    XLSX.utils.book_append_sheet(wb, ws, "报表");
    downloadBlob(new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})], {type:"application/octet-stream"}), type+"_report.xlsx");
    showToast("报表已生成!", "success");
  } catch(e) { showToast("报表生成错误: "+e.message, "error"); }
}
function colMatch(cols, names, fallback) {
  for (var i=0; i<cols.length; i++) {
    for (var j=0; j<names.length; j++) {
      if (cols[i].indexOf(names[j]) >= 0) return cols[i];
    }
  }
  return fallback;
}

// ===== 2. 跨文件合并 =====
(function(){
  var inp = document.createElement("input");
  inp.type="file"; inp.multiple=true; inp.accept=".xlsx,.xls,.csv";
  inp.style.display="none"; inp.id="multiMergeInput";
  inp.onchange = function(e){
    var files = Array.from(e.target.files);
    if (files.length<2) { showToast("请选至少2个文件","error"); return; }
    showToast("正在合并 "+files.length+" 个文件...");
    var all=[], done=0;
    files.forEach(function(f){
      var rdr = new FileReader();
      rdr.onload = function(ev){
        try {
          var wb = XLSX.read(ev.target.result, {type:"array"});
          wb.SheetNames.forEach(function(nm){
            XLSX.utils.sheet_to_json(wb.Sheets[nm],{defval:""}).forEach(function(r){
              r["来源"] = f.name+"["+nm+"]"; all.push(r);
            });
          });
        } catch(err){ showToast("处理失败: "+f.name,"error"); }
        done++;
        if (done>=files.length) {
          currentData=all; renderTable(currentData);
          if (typeof updateStats==="function") updateStats();
          showToast("合并完成! 共"+all.length+"行","success");
        }
      };
      rdr.readAsArrayBuffer(f);
    });
  };
  document.body.appendChild(inp);
})();

// ===== 3. 公式解释(覆盖旧版) =====
function explainFormula() {
  try {
    var inp = document.getElementById("explainInput");
    if (!inp || !inp.value) { showToast("请粘贴公式","error"); return; }
    var f = inp.value, h = "";
    h += "<div style=\"background:#f0fdf4;border:1px solid #bbf7d0;padding:10px;border-radius:6px;margin-bottom:8px;\">";
    h += "<strong>公式:</strong> <code>"+esc(f)+"</code></div>";
    h += "<div style=\"background:#f8f9fa;padding:10px;border-radius:6px;line-height:1.8;font-size:13px;\">";
    if (f.indexOf("IF")>=0) {
      var m = f.match(/IF\(([^,]+),([^,]+),([^)]+)\)/);
      if (m) h += "<div>• 条件: <code>"+esc(m[1])+"</code></div><div>• 成立时: <code>"+esc(m[2])+"</code></div><div>• 不成立时: <code>"+esc(m[3])+"</code></div>";
    }
    if (f.indexOf("VLOOKUP")>=0) h += "<div>• 垂直查找匹配</div>";
    if (f.indexOf("SUM")>=0) h += "<div>• 求和运算</div>";
    if (f.indexOf("COUNT")>=0) h += "<div>• 计数运算</div>";
    h += "</div>";
    var el = document.getElementById("explainText");
    if (el) el.innerHTML = h;
  } catch(e) { showToast("翻译错误: "+e.message,"error"); }
}
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }