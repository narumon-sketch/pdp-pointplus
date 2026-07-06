/**
 * teacher.js — หน้าจอบัญชีกลุ่มสาระ (ครู)
 */
const TeacherView = {
  _roster: [],

  // ---------- แดชบอร์ด ----------
  async dashboard() {
    const d = await API.call('teacherDashboard');
    App.setContent(`
      <h4 class="mb-1">แดชบอร์ด</h4>
      <p class="text-muted">${UI.escape(d.learningArea)} · เทอม ${d.term}/${d.academicYear}</p>
      <div class="row g-3">
        ${TeacherView._stat('กิจกรรม', d.activityCount, 'calendar2-week', 'primary')}
        ${TeacherView._stat('รออนุมัติ', d.pendingCount, 'hourglass-split', 'warning')}
        ${TeacherView._stat('ผู้สมัครทั้งหมด', d.applicantCount, 'people', 'info')}
      </div>`);
  },

  _stat(label, value, icon, color) {
    return `<div class="col-md-4">
      <div class="stat-card card p-3">
        <div class="d-flex justify-content-between">
          <div><div class="text-muted small">${label}</div><div class="stat-value text-${color}">${value}</div></div>
          <i class="bi bi-${icon} stat-icon text-${color}"></i>
        </div>
      </div></div>`;
  },

  // ---------- รายการกิจกรรมของกลุ่ม ----------
  async activities(silent) {
    if (!silent) {
      App.setContent(`
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4 class="mb-0">กิจกรรมของกลุ่ม</h4>
          <div>
            <button id="act-refresh" class="btn btn-sm btn-outline-secondary"><i class="bi bi-arrow-clockwise"></i></button>
            <button id="act-new" class="btn btn-sm btn-primary"><i class="bi bi-plus-circle me-1"></i>สร้างกิจกรรม</button>
          </div>
        </div>
        <div class="card p-0"><div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr>
              <th>กิจกรรม</th><th>วัน-เวลา</th><th class="text-center">ชม.</th>
              <th class="text-center">สมัคร/รับ</th><th class="text-center">รออนุมัติ</th>
              <th class="text-center">สถานะ</th><th></th>
            </tr></thead>
            <tbody id="act-tbody"></tbody>
          </table>
        </div></div>`);
      document.getElementById('act-new').addEventListener('click', () => TeacherView._openForm());
      document.getElementById('act-refresh').addEventListener('click', () => TeacherView.activities(false));
      // โหลด roster สำหรับ dropdown ผู้รับผิดชอบ
      const areas = await API.call('listLearningAreas');
      const mine = areas.find(a => a.name === App.state.user.learningArea);
      TeacherView._roster = mine ? mine.teacherRoster : [];
      App.startPoll(() => TeacherView.activities(true));
    }

    const list = await API.call('listActivities', { scope: 'all' }, silent);
    const tbody = document.getElementById('act-tbody');
    if (!tbody) return;
    tbody.innerHTML = list.length ? list.map(a => {
      const canEdit = a.status === 'open' && !a.isPast;
      return `<tr>
        <td>${UI.escape(a.title)}<br><small class="text-muted">${UI.escape(a.responsibleTeacher || '')}</small></td>
        <td>${UI.escape(a.date)}<br><small class="text-muted">${UI.escape(a.startTime)}-${UI.escape(a.endTime)}</small></td>
        <td class="text-center">${a.hoursAwardedHHMM}</td>
        <td class="text-center">${a.pendingCount}/${a.capacity}</td>
        <td class="text-center">${a.pendingCount ? `<span class="badge text-bg-warning">${a.pendingCount}</span>` : '0'}</td>
        <td class="text-center">${a.status === 'open' ? '<span class="badge text-bg-success">เปิด</span>' : '<span class="badge text-bg-secondary">ปิด</span>'}${a.isPast ? '<br><small class="text-muted">จบแล้ว</small>' : ''}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-primary" data-applicants="${a.activityId}"><i class="bi bi-people"></i> ผู้สมัคร</button>
          ${canEdit ? `<button class="btn btn-sm btn-outline-secondary" data-edit="${a.activityId}"><i class="bi bi-pencil"></i></button>` : ''}
          ${a.status === 'open' ? `<button class="btn btn-sm btn-outline-warning" data-close="${a.activityId}"><i class="bi bi-lock"></i></button>` : ''}
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="text-center text-muted py-4">ยังไม่มีกิจกรรม</td></tr>';

    TeacherView._activitiesCache = list;
    tbody.querySelectorAll('[data-applicants]').forEach(b => b.addEventListener('click', () => TeacherView.applicants(b.dataset.applicants)));
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => TeacherView._openForm(list.find(x => x.activityId === b.dataset.edit))));
    tbody.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => TeacherView._close(b.dataset.close)));
  },

  async _close(activityId) {
    if (!confirm('ปิดรับสมัครกิจกรรมนี้?')) return;
    try { await API.call('closeActivity', { activityId }); UI.toast('ปิดกิจกรรมแล้ว', 'success'); TeacherView.activities(true); }
    catch (e) { UI.toast(e.message, 'danger'); }
  },

  // ---------- ฟอร์มสร้าง/แก้ไขกิจกรรม ----------
  _openForm(act) {
    const isEdit = !!act;
    const rosterOptions = TeacherView._roster.map(n => `<option value="${UI.escape(n)}">${UI.escape(n)}</option>`).join('');
    const v = act || {};
    const modal = App.showModal(`
      <div class="modal fade" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">${isEdit ? 'แก้ไข' : 'สร้าง'}กิจกรรม</h5>
          <button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <form id="act-form" class="row g-3">
            <div class="col-12"><label class="form-label">ชื่อกิจกรรม *</label>
              <input name="title" class="form-control" required value="${UI.escape(v.title || '')}"></div>
            <div class="col-12"><label class="form-label">รายละเอียด</label>
              <textarea name="description" class="form-control" rows="2">${UI.escape(v.description || '')}</textarea></div>
            <div class="col-md-6"><label class="form-label">สถานที่</label>
              <input name="location" class="form-control" value="${UI.escape(v.location || '')}"></div>
            <div class="col-md-6"><label class="form-label">ผู้รับผิดชอบ *</label>
              <input name="responsibleTeacher" class="form-control" list="roster" required value="${UI.escape(v.responsibleTeacher || '')}">
              <datalist id="roster">${rosterOptions}</datalist></div>
            <div class="col-md-4"><label class="form-label">วันที่ *</label>
              <input type="date" name="date" class="form-control" required value="${UI.escape(v.date || '')}"></div>
            <div class="col-md-4"><label class="form-label">เวลาเริ่ม *</label>
              <input type="time" name="startTime" class="form-control" required value="${UI.escape(v.startTime || '')}"></div>
            <div class="col-md-4"><label class="form-label">เวลาสิ้นสุด *</label>
              <input type="time" name="endTime" class="form-control" required value="${UI.escape(v.endTime || '')}"></div>
            <div class="col-md-4"><label class="form-label">ชั่วโมงที่ได้รับ *</label>
              <input name="hoursAwarded" class="form-control" required placeholder="เช่น 1:30 หรือ 1.5" value="${v.hoursAwarded != null ? v.hoursAwarded : ''}"></div>
            <div class="col-md-4"><label class="form-label">จำนวนรับ *</label>
              <input type="number" name="capacity" class="form-control" min="1" required value="${v.capacity || ''}"></div>
            <div class="col-12"><small class="text-muted">ระยะเวลา (สิ้นสุด−เริ่ม) ต้องอยู่ 30–120 นาที · กลุ่มสาระ = ${UI.escape(App.state.user.learningArea)}</small></div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
          <button class="btn btn-primary" id="act-save">${isEdit ? 'บันทึก' : 'สร้าง'}</button>
        </div>
      </div></div></div>`);

    document.getElementById('act-save').addEventListener('click', async () => {
      const form = document.getElementById('act-form');
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        if (isEdit) await API.call('updateActivity', Object.assign({ activityId: act.activityId }, data));
        else await API.call('createActivity', data);
        UI.toast(isEdit ? 'บันทึกแล้ว' : 'สร้างกิจกรรมแล้ว', 'success');
        modal.hide();
        TeacherView.activities(true);
      } catch (e) { UI.toast(e.message, 'danger'); }
    });
  },

  // ---------- ดูผู้สมัคร + อนุมัติ (เช็คชื่อ) ----------
  async applicants(activityId) {
    App.stopPoll();
    const regs = await API.call('listRegistrations', { activityId });
    TeacherView._currentActivityId = activityId;
    TeacherView._regs = regs;

    const rows = regs.length ? regs.map(r => `
      <tr>
        <td class="text-center">${r.status === 'pending'
          ? `<input type="checkbox" class="form-check-input attend-chk" value="${r.registrationId}">` : ''}</td>
        <td>${UI.escape(r.studentName)}</td>
        <td>${UI.escape(r.classSnapshot)}</td>
        <td class="text-center">${UI.escape(r.studentNoSnapshot)}</td>
        <td>${UI.statusBadge(r.status)}</td>
      </tr>`).join('') : '<tr><td colspan="5" class="text-center text-muted py-4">ยังไม่มีผู้สมัคร</td></tr>';

    App.setContent(`
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0">ผู้สมัคร</h4>
        <button class="btn btn-sm btn-outline-secondary" data-back><i class="bi bi-arrow-left me-1"></i>กลับ</button>
      </div>
      <div class="alert alert-info small"><i class="bi bi-info-circle me-1"></i>ติ๊กเช็คชื่อผู้ที่<b>มาร่วมกิจกรรมจริง</b> แล้วกด "อนุมัติที่เลือก" (ชั่วโมงจะเข้าอัตโนมัติ) · อนุมัติแล้วแก้ไม่ได้</div>
      <div class="card p-0"><div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light"><tr>
            <th class="text-center" style="width:40px"><input type="checkbox" id="chk-all" class="form-check-input"></th>
            <th>ชื่อ</th><th>ชั้น</th><th class="text-center">เลขที่</th><th>สถานะ</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>
      <div class="mt-3 d-flex gap-2 flex-wrap">
        <button class="btn btn-success" id="btn-approve"><i class="bi bi-check2-circle me-1"></i>อนุมัติที่เลือก</button>
        <button class="btn btn-outline-danger" id="btn-reject-rest"><i class="bi bi-x-circle me-1"></i>ไม่อนุมัติผู้ที่เหลือ</button>
        <button class="btn btn-outline-secondary ms-auto" id="btn-export"><i class="bi bi-file-earmark-excel me-1"></i>Export</button>
      </div>`);

    document.querySelector('[data-back]').addEventListener('click', () => TeacherView.activities(false));
    const chkAll = document.getElementById('chk-all');
    chkAll.addEventListener('change', () => document.querySelectorAll('.attend-chk').forEach(c => c.checked = chkAll.checked));
    document.getElementById('btn-approve').addEventListener('click', TeacherView._approveSelected);
    document.getElementById('btn-reject-rest').addEventListener('click', TeacherView._rejectRest);
    document.getElementById('btn-export').addEventListener('click', TeacherView._exportApplicants);
  },

  _checkedIds() {
    return [...document.querySelectorAll('.attend-chk:checked')].map(c => c.value);
  },

  async _approveSelected() {
    const ids = TeacherView._checkedIds();
    if (!ids.length) return UI.toast('ยังไม่ได้เลือกผู้เข้าร่วม', 'warning');
    if (!confirm(`อนุมัติ ${ids.length} คน? (แก้ไม่ได้ภายหลัง)`)) return;
    try {
      const r = await API.call('approveRegistrations', { activityId: TeacherView._currentActivityId, registrationIds: ids });
      UI.toast(`อนุมัติแล้ว ${r.approved} คน`, 'success');
      TeacherView.applicants(TeacherView._currentActivityId);
    } catch (e) { UI.toast(e.message, 'danger'); }
  },

  async _rejectRest() {
    const pendingIds = TeacherView._regs.filter(r => r.status === 'pending').map(r => r.registrationId);
    const checked = new Set(TeacherView._checkedIds());
    const rest = pendingIds.filter(id => !checked.has(id));
    if (!rest.length) return UI.toast('ไม่มีผู้ที่เหลือให้ไม่อนุมัติ', 'info');
    if (!confirm(`ไม่อนุมัติผู้ที่เหลือ ${rest.length} คน?`)) return;
    try {
      const r = await API.call('rejectRegistrations', { activityId: TeacherView._currentActivityId, registrationIds: rest });
      UI.toast(`ไม่อนุมัติ ${r.rejected} คน`, 'success');
      TeacherView.applicants(TeacherView._currentActivityId);
    } catch (e) { UI.toast(e.message, 'danger'); }
  },

  _exportApplicants() {
    const act = (TeacherView._activitiesCache || []).find(a => a.activityId === TeacherView._currentActivityId);
    const title = act ? act.title : 'ผู้สมัคร';
    Exporter.toExcel(TeacherView._regs, [
      { key: 'studentName', label: 'ชื่อ' }, { key: 'classSnapshot', label: 'ชั้น' },
      { key: 'studentNoSnapshot', label: 'เลขที่' }, { key: 'status', label: 'สถานะ' },
      { key: 'hoursAwardedHHMM', label: 'ชั่วโมง' }
    ], 'ผู้สมัคร-' + title);
  }
};
window.TeacherView = TeacherView;
