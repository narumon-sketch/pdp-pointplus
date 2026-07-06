/**
 * export.js — ส่งออกข้อมูลฝั่ง client
 *  - Excel: SheetJS (รองรับภาษาไทยดี)
 *  - PDF: ใช้พิมพ์ผ่านเบราว์เซอร์ (window.print → Save as PDF) เพื่อรองรับฟอนต์ไทยได้ชัวร์
 */
const Exporter = {
  /** rows = array ของ object; headers = [{key,label}] */
  toExcel(rows, headers, filename) {
    const data = rows.map(r => {
      const o = {};
      headers.forEach(h => { o[h.label] = r[h.key]; });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(data, { header: headers.map(h => h.label) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
  },

  /**
   * Export หลายแท็บในไฟล์เดียว
   * sheets = [{ name, rows, headers:[{key,label}] }]  (1 แท็บ/ห้อง)
   */
  toExcelMultiSheet(sheets, filename) {
    const wb = XLSX.utils.book_new();
    const used = {};
    sheets.forEach(s => {
      const data = s.rows.map(r => {
        const o = {}; s.headers.forEach(h => { o[h.label] = r[h.key]; }); return o;
      });
      const ws = XLSX.utils.json_to_sheet(data, { header: s.headers.map(h => h.label) });
      // ชื่อแท็บ Excel: ห้ามมี \ / ? * [ ] : และยาวไม่เกิน 31 ตัว + กันชื่อซ้ำ
      let name = String(s.name || 'Sheet').replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31) || 'Sheet';
      if (used[name]) name = (name.slice(0, 28) + '_' + (++used[name.slice(0, 28)] || 2)).slice(0, 31);
      used[name] = (used[name] || 1);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
  },

  /** เปิดหน้าต่างพิมพ์สำหรับบันทึกเป็น PDF (title + ตาราง HTML) */
  toPDF(title, tableHtml) {
    const win = window.open('', '_blank');
    win.document.write(`
      <html lang="th"><head><meta charset="utf-8"><title>${UI.escape(title)}</title>
      <style>
        body{font-family:'Sarabun','Segoe UI',sans-serif;padding:24px;}
        h2{margin-bottom:16px;}
        table{width:100%;border-collapse:collapse;font-size:14px;}
        th,td{border:1px solid #999;padding:6px 8px;text-align:left;}
        th{background:#eef;}
      </style></head>
      <body><h2>${UI.escape(title)}</h2>${tableHtml}
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    win.document.close();
  }
};
