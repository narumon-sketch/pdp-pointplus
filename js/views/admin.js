/**
 * admin.js — หน้าจอผู้ดูแลระบบ
 */
const AdminView = {
  _users: [],

  // ---------- แดชบอร์ด ----------
  async dashboard() {
    const d = await API.call('adminDashboard');
    const gradeRows = d.reachedByGrade.length ? d.reachedByGrade.map(g => `
      <tr><td>${UI.escape(g.gradeLevel)}</td>
        <td class="text-center">${g.reached}/${g.total}</td>
        <td><div class="progress" style="height:18px"><div class="progress-bar ${g.percent >= 100 ? 'bg-success' : 'bg-primary'}" style="width:${g.percent}%">${g.percent}%</div></div></td>
      </tr>`).join('') : '<tr><td colspan="3" class="text-muted text-center">ยังไม่มีข้อมูล</td></tr>';

    const areaRows = Object.keys(d.activityByArea).length
      ? Object.keys(d.activityByArea).map(k => `<li class="list-group-item d-flex justify-content-between"><span>${UI.escape(k)}</span><span class="badge text-bg-primary">${d.activityByArea[k]}</span></li>`).join('')
      : '<li class="list-group-item text-muted">ยังไม่มีกิจกรรม</li>';

    App.setContent(`
      <h4 class="mb-1">แดชบอร์ด</h4>
      <p class="text-muted">เทอม ${d.term}/${d.academicYear} · เป้า ${d.targetHHMM} ชม./เทอม</p>
      <div class="row g-3 mb-3">
        ${AdminView._stat('นักเรียน', d.userCounts.student, 'mortarboard', 'primary')}
        ${AdminView._stat('บัญชีกลุ่มสาระ', d.userCounts.teacher, 'person-badge', 'info')}
        ${AdminView._stat('กิจกรรม', d.activityCount, 'calendar2-week', 'success')}
        ${AdminView._stat('รออนุมัติทั้งระบบ', d.pendingTotal, 'hourglass-split', 'warning')}
      </div>
      <div class="row g-3">
        <div class="col-lg-7"><div class="card p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">นักเรียนถึงเป้า แยกระดับชั้น</h6>
            <div class="d-flex gap-2">
              <select id="hours-class" class="form-select form-select-sm" style="width:120px"><option value="">ทุกห้อง</option></select>
              <button class="btn btn-sm btn-outline-secondary" id="btn-export-hours"><i class="bi bi-file-earmark-excel me-1"></i>Export</button>
            </div>
          </div>
          <table class="table table-sm align-middle mb-0"><thead><tr><th>ชั้น</th><th class="text-center">ถึงเป้า</th><th>สัดส่วน</th></tr></thead>
          <tbody>${gradeRows}</tbody></table>
        </div></div>
        <div class="col-lg-5"><div class="card p-3">
          <h6 class="mb-2">กิจกรรมแยกกลุ่มสาระ</h6>
          <ul class="list-group list-group-flush">${areaRows}</ul>
        </div></div>
      </div>`);
    document.getElementById('btn-export-hours').addEventListener('click', AdminView._exportHours);
    // โหลดรายงานชั่วโมงล่วงหน้า → ทำรายการห้องใน dropdown + ใช้ตอน export (silent ไม่โชว์ loading)
    AdminView._hoursReport = await API.call('hoursReport', {}, true);
    const classes = [...new Set(AdminView._hoursReport.rows.map(r => r.className))].sort();
    const sel = document.getElementById('hours-class');
    classes.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
  },

  _stat(label, value, icon, color) {
    return `<div class="col-6 col-lg-3"><div class="stat-card card p-3">
      <div class="d-flex justify-content-between">
        <div><div class="text-muted small">${label}</div><div class="stat-value text-${color}">${value}</div></div>
        <i class="bi bi-${icon} stat-icon text-${color}"></i>
      </div></div></div>`;
  },

  _exportHours() {
    const rep = AdminView._hoursReport;
    if (!rep) return UI.toast('ยังโหลดข้อมูลไม่เสร็จ ลองใหม่อีกครั้ง', 'warning');
    const headers = [
      { key: 'className', label: 'ชั้น' }, { key: 'studentNo', label: 'เลขที่' },
      { key: 'fullName', label: 'ชื่อ-สกุล' }, { key: 'email', label: 'อีเมล' },
      { key: 'hoursHHMM', label: 'ชั่วโมงสะสม' }, { key: 'reached', label: 'สถานะเป้า' }
    ];
    const chosen = document.getElementById('hours-class').value;

    if (chosen) {
      // เลือกห้องเดียว → ไฟล์แท็บเดียวเฉพาะห้องนั้น
      const rows = rep.rows.filter(r => r.className === chosen);
      if (!rows.length) return UI.toast('ห้องนี้ไม่มีนักเรียน', 'info');
      Exporter.toExcel(rows, headers, `สรุปชั่วโมง-${chosen.replace('/', '-')}-เทอม${rep.term}-${rep.academicYear}`);
    } else {
      // ทุกห้อง → แยกแท็บรายห้อง + แท็บ "ทั้งหมด"
      const groups = {};
      rep.rows.forEach(r => { (groups[r.className] = groups[r.className] || []).push(r); });
      const sheets = [{ name: 'ทั้งหมด', rows: rep.rows, headers }];
      Object.keys(groups).sort().forEach(cls => sheets.push({ name: cls, rows: groups[cls], headers }));
      Exporter.toExcelMultiSheet(sheets, `สรุปชั่วโมง-เทอม${rep.term}-${rep.academicYear}`);
    }
  },

  // ---------- จัดการผู้ใช้ ----------
  async users() {
    App.setContent(`
      <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h4 class="mb-0">จัดการผู้ใช้</h4>
        <div class="d-flex gap-2">
          <input id="u-search" class="form-control form-control-sm" placeholder="ค้นหา..." style="width:160px">
          <select id="u-role" class="form-select form-select-sm" style="width:130px">
            <option value="">ทุก role</option><option value="student">นักเรียน</option>
            <option value="teacher">ครู</option><option value="admin">ผู้ดูแล</option>
          </select>
          <button id="u-import" class="btn btn-sm btn-outline-success"><i class="bi bi-upload me-1"></i>นำเข้านักเรียน</button>
          <button id="u-new" class="btn btn-sm btn-primary"><i class="bi bi-person-plus me-1"></i>เพิ่มผู้ใช้</button>
        </div>
      </div>
      <div class="card p-0"><div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light"><tr><th>ชื่อ</th><th>อีเมล</th><th>Role</th><th>กลุ่ม/ชั้น</th><th>สถานะ</th><th></th></tr></thead>
          <tbody id="u-tbody"></tbody>
        </table>
      </div></div>`);
    document.getElementById('u-new').addEventListener('click', () => AdminView._userForm());
    document.getElementById('u-import').addEventListener('click', () => AdminView._importForm());
    document.getElementById('u-search').addEventListener('input', AdminView._renderUsers);
    document.getElementById('u-role').addEventListener('change', AdminView._renderUsers);
    AdminView._users = await API.call('listUsers');
    AdminView._renderUsers();
  },

  _renderUsers() {
    const q = (document.getElementById('u-search')?.value || '').toLowerCase();
    const role = document.getElementById('u-role')?.value || '';
    const list = AdminView._users.filter(u => {
      if (role && u.role !== role) return false;
      if (q && !(`${u.fullName} ${u.email} ${u.studentNo}`.toLowerCase().includes(q))) return false;
      return true;
    });
    const tbody = document.getElementById('u-tbody');
    tbody.innerHTML = list.length ? list.map(u => `
      <tr>
        <td>${UI.escape(u.fullName || '-')}</td>
        <td class="small">${UI.escape(u.email)}</td>
        <td>${App.roleLabel(u.role)}</td>
        <td>${UI.escape(u.role === 'student' ? (u.gradeLevel + '/' + u.room + ' เลขที่ ' + u.studentNo) : (u.learningArea || '-'))}</td>
        <td>${u.status === 'active' ? '<span class="badge text-bg-success">ใช้งาน</span>' : `<span class="badge text-bg-secondary">${UI.escape(u.status)}</span>`}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" data-edit="${UI.escape(u.email)}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-del="${UI.escape(u.email)}"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted py-4">ไม่พบผู้ใช้</td></tr>';

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => AdminView._userForm(AdminView._users.find(x => x.email === b.dataset.edit))));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => AdminView._deleteUser(b.dataset.del)));
  },

  async _deleteUser(email) {
    if (!confirm(`ลบผู้ใช้ ${email}?`)) return;
    try { await API.call('deleteUser', { email }); UI.toast('ลบแล้ว', 'success'); AdminView.users(); }
    catch (e) { UI.toast(e.message, 'danger'); }
  },

  _userForm(u) {
    const isEdit = !!u;
    const v = u || { role: 'student', status: 'active' };
    const modal = App.showModal(`
      <div class="modal fade" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">${isEdit ? 'แก้ไข' : 'เพิ่ม'}ผู้ใช้</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><form id="u-form" class="row g-3">
          <div class="col-12"><label class="form-label">อีเมล *</label>
            <input name="email" class="form-control" required value="${UI.escape(v.email || '')}" ${isEdit ? 'readonly' : ''}></div>
          <div class="col-6"><label class="form-label">Role *</label>
            <select name="role" id="uf-role" class="form-select">
              <option value="student" ${v.role === 'student' ? 'selected' : ''}>นักเรียน</option>
              <option value="teacher" ${v.role === 'teacher' ? 'selected' : ''}>ครู (บัญชีกลุ่ม)</option>
              <option value="admin" ${v.role === 'admin' ? 'selected' : ''}>ผู้ดูแล</option>
            </select></div>
          <div class="col-6"><label class="form-label">สถานะ</label>
            <select name="status" class="form-select">
              <option value="active" ${v.status === 'active' ? 'selected' : ''}>ใช้งาน</option>
              <option value="graduated" ${v.status === 'graduated' ? 'selected' : ''}>จบการศึกษา</option>
              <option value="inactive" ${v.status === 'inactive' ? 'selected' : ''}>ปิดใช้งาน</option>
            </select></div>
          <div class="col-12"><label class="form-label">ชื่อ-สกุล</label>
            <input name="fullName" class="form-control" value="${UI.escape(v.fullName || '')}"></div>
          <div class="col-12 uf-teacher d-none"><label class="form-label">กลุ่มสาระ</label>
            <input name="learningArea" class="form-control" value="${UI.escape(v.learningArea || '')}"></div>
          <div class="row g-2 uf-student">
            <div class="col-4"><label class="form-label">ชั้น</label><input name="gradeLevel" class="form-control" placeholder="ม.1" value="${UI.escape(v.gradeLevel || '')}"></div>
            <div class="col-4"><label class="form-label">ห้อง</label><input name="room" class="form-control" value="${UI.escape(v.room || '')}"></div>
            <div class="col-4"><label class="form-label">เลขที่</label><input name="studentNo" class="form-control" value="${UI.escape(v.studentNo || '')}"></div>
          </div>
        </form></div>
        <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
          <button class="btn btn-primary" id="u-save">${isEdit ? 'บันทึก' : 'เพิ่ม'}</button></div>
      </div></div></div>`);

    const toggle = () => {
      const role = document.getElementById('uf-role').value;
      document.querySelector('.uf-student').classList.toggle('d-none', role !== 'student');
      document.querySelector('.uf-teacher').classList.toggle('d-none', role !== 'teacher');
    };
    document.getElementById('uf-role').addEventListener('change', toggle); toggle();

    document.getElementById('u-save').addEventListener('click', async () => {
      const form = document.getElementById('u-form');
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        if (isEdit) await API.call('updateUser', data);
        else await API.call('createUser', data);
        UI.toast(isEdit ? 'บันทึกแล้ว' : 'เพิ่มผู้ใช้แล้ว', 'success');
        modal.hide(); AdminView.users();
      } catch (e) { UI.toast(e.message, 'danger'); }
    });
  },

  // ---------- นำเข้านักเรียนจากไฟล์ ----------
  _importForm() {
    const modal = App.showModal(`
      <div class="modal fade" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">นำเข้านักเรียน (.xlsx/.csv)</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <p class="small text-muted">ไฟล์ต้องมีคอลัมน์: <code>email, fullName, gradeLevel, room, studentNo</code>
            <a href="#" id="dl-template">ดาวน์โหลด template</a></p>
          <input type="file" id="import-file" class="form-control" accept=".xlsx,.xls,.csv">
          <div id="import-preview" class="mt-3 small"></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
          <button class="btn btn-success" id="import-run" disabled>นำเข้า</button></div>
      </div></div></div>`);

    let rows = [];
    document.getElementById('dl-template').addEventListener('click', (e) => {
      e.preventDefault();
      Exporter.toExcel([{ email: '', fullName: '', gradeLevel: '', room: '', studentNo: '' }],
        [{ key: 'email', label: 'email' }, { key: 'fullName', label: 'fullName' },
         { key: 'gradeLevel', label: 'gradeLevel' }, { key: 'room', label: 'room' }, { key: 'studentNo', label: 'studentNo' }],
        'template-นักเรียน');
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        document.getElementById('import-preview').innerHTML =
          `<div class="alert alert-info mb-0">พบ ${rows.length} แถว พร้อมนำเข้า</div>`;
        document.getElementById('import-run').disabled = rows.length === 0;
      };
      reader.readAsBinaryString(file);
    });

    document.getElementById('import-run').addEventListener('click', async () => {
      try {
        const r = await API.call('importStudents', { rows });
        let msg = `นำเข้าสำเร็จ: เพิ่ม ${r.created}, อัปเดต ${r.updated}, ข้าม ${r.skipped.length}`;
        UI.toast(msg, r.skipped.length ? 'warning' : 'success');
        if (r.skipped.length) {
          document.getElementById('import-preview').innerHTML =
            `<div class="alert alert-warning"><b>ข้าม ${r.skipped.length} แถว:</b><ul class="mb-0">` +
            r.skipped.map(s => `<li>แถว ${s.row} (${UI.escape(s.email)}): ${UI.escape(s.reason)}</li>`).join('') + '</ul></div>';
        } else { modal.hide(); }
        AdminView.users();
      } catch (e) { UI.toast(e.message, 'danger'); }
    });
  },

  // ---------- จัดการกลุ่มสาระ ----------
  async areas() {
    const areas = await API.call('listLearningAreas');
    App.setContent(`
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0">กลุ่มสาระ</h4>
        <button id="a-new" class="btn btn-sm btn-primary"><i class="bi bi-plus-circle me-1"></i>เพิ่มกลุ่มสาระ</button>
      </div>
      <div class="card p-0"><div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light"><tr><th>ชื่อ</th><th>บัญชีกลาง (อีเมล)</th><th>รายชื่อครู</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>${areas.map(a => `
            <tr>
              <td>${UI.escape(a.name)}</td>
              <td class="small">${UI.escape(a.accountEmail || '-')}</td>
              <td class="small">${UI.escape((a.teacherRoster || []).join(', ') || '-')}</td>
              <td>${a.active ? '<span class="badge text-bg-success">เปิด</span>' : '<span class="badge text-bg-secondary">ปิด</span>'}</td>
              <td class="text-end"><button class="btn btn-sm btn-outline-secondary" data-edit="${UI.escape(a.areaId)}"><i class="bi bi-pencil"></i></button></td>
            </tr>`).join('')}</tbody>
        </table>
      </div></div>`);
    document.getElementById('a-new').addEventListener('click', () => AdminView._areaForm());
    document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => AdminView._areaForm(areas.find(x => x.areaId === b.dataset.edit))));
  },

  _areaForm(a) {
    const isEdit = !!a;
    const v = a || { active: true };
    const modal = App.showModal(`
      <div class="modal fade" tabindex="-1"><div class="modal-dialog"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">${isEdit ? 'แก้ไข' : 'เพิ่ม'}กลุ่มสาระ</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"><form id="a-form" class="row g-3">
          <div class="col-12"><label class="form-label">ชื่อกลุ่มสาระ *</label><input name="name" class="form-control" required value="${UI.escape(v.name || '')}"></div>
          <div class="col-12"><label class="form-label">อีเมลบัญชีกลาง (@pdp.ac.th)</label><input name="accountEmail" class="form-control" value="${UI.escape(v.accountEmail || '')}"></div>
          <div class="col-12"><label class="form-label">รายชื่อครู (คั่นด้วย ,)</label>
            <textarea name="teacherRoster" class="form-control" rows="2">${UI.escape((v.teacherRoster || []).join(', '))}</textarea></div>
          <div class="col-12 form-check ms-2"><input type="checkbox" class="form-check-input" id="a-active" ${v.active ? 'checked' : ''}><label class="form-check-label" for="a-active">เปิดใช้งาน</label></div>
        </form></div>
        <div class="modal-footer"><button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
          <button class="btn btn-primary" id="a-save">${isEdit ? 'บันทึก' : 'เพิ่ม'}</button></div>
      </div></div></div>`);

    document.getElementById('a-save').addEventListener('click', async () => {
      const form = document.getElementById('a-form');
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      data.teacherRoster = data.teacherRoster.split(',').map(s => s.trim()).filter(Boolean);
      data.active = document.getElementById('a-active').checked;
      try {
        if (isEdit) await API.call('updateLearningArea', Object.assign({ areaId: a.areaId }, data));
        else await API.call('createLearningArea', data);
        UI.toast('บันทึกแล้ว', 'success'); modal.hide(); AdminView.areas();
      } catch (e) { UI.toast(e.message, 'danger'); }
    });
  },

  // ---------- ตั้งค่าระบบ ----------
  async settings() {
    const s = await API.call('getSettings');
    App.setContent(`
      <h4 class="mb-3">ตั้งค่าระบบ</h4>
      <div class="card p-4" style="max-width:560px">
        <form id="s-form" class="row g-3">
          <div class="col-6"><label class="form-label">ปีการศึกษาปัจจุบัน</label><input name="currentAcademicYear" class="form-control" value="${UI.escape(s.currentAcademicYear)}"></div>
          <div class="col-6"><label class="form-label">ภาคเรียนปัจจุบัน</label>
            <select name="currentTerm" class="form-select"><option ${s.currentTerm == '1' ? 'selected' : ''}>1</option><option ${s.currentTerm == '2' ? 'selected' : ''}>2</option></select></div>
          <div class="col-6"><label class="form-label">เป้าชั่วโมง/เทอม (H:MM)</label><input name="targetHoursPerTerm" class="form-control" value="${UI.escape(s.targetHoursPerTerm)}"></div>
          <div class="col-12"><label class="form-label">ชื่อโรงเรียน/ระบบ</label><input name="schoolName" class="form-control" value="${UI.escape(s.schoolName)}"></div>
          <div class="col-12"><label class="form-label">URL โลโก้</label><input name="logoUrl" class="form-control" value="${UI.escape(s.logoUrl)}"></div>
          <div class="col-12"><button type="button" class="btn btn-primary" id="s-save">บันทึก</button></div>
          <div class="col-12"><small class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>เปลี่ยนเทอม/ปี จะรีเซ็ต progress นักเรียนเป็นเทอมใหม่ (ประวัติเดิมยังอยู่)</small></div>
        </form>
      </div>`);
    document.getElementById('s-save').addEventListener('click', async () => {
      const data = Object.fromEntries(new FormData(document.getElementById('s-form')).entries());
      try { await API.call('updateSettings', { settings: data }); UI.toast('บันทึกการตั้งค่าแล้ว', 'success'); }
      catch (e) { UI.toast(e.message, 'danger'); }
    });
  }
};
window.AdminView = AdminView;
