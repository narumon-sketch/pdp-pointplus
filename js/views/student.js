/**
 * student.js — หน้าจอนักเรียน
 */
const StudentView = {
  _activities: [],
  _areas: [],

  // ---------- หน้าหลัก: ชั่วโมงสะสม ----------
  async dashboard() {
    const hours = await API.call('myHours');
    const pct = hours.targetMinutes ? Math.min(100, Math.round(hours.currentMinutes * 100 / hours.targetMinutes)) : 0;
    const reachedBadge = hours.reached
      ? '<span class="badge text-bg-success">ถึงเป้าแล้ว</span>'
      : `<span class="badge text-bg-warning">ขาดอีก ${UI.hoursToHHMM(hours.remainingMinutes / 60)} ชม.</span>`;

    const historyRows = hours.history.length
      ? hours.history.map(h => `<tr><td>ปี ${h.academicYear} เทอม ${h.term}</td><td class="text-end">${h.hhmm} ชม.</td></tr>`).join('')
      : '<tr><td colspan="2" class="text-muted text-center">ยังไม่มีประวัติ</td></tr>';

    App.setContent(`
      <h4 class="mb-3">สวัสดี, ${UI.escape(App.state.user.fullName || '')}</h4>
      <div class="row g-3">
        <div class="col-lg-7">
          <div class="card p-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h5 class="mb-0">ชั่วโมงสะสม เทอม ${hours.currentTerm}/${hours.currentAcademicYear}</h5>
              ${reachedBadge}
            </div>
            <div class="display-5 fw-bold text-primary mb-2">${hours.currentHHMM} <small class="fs-6 text-muted">/ ${hours.targetHHMM} ชม.</small></div>
            <div class="progress hours-progress mb-2">
              <div class="progress-bar ${hours.reached ? 'bg-success' : 'bg-primary'}" style="width:${pct}%">${pct}%</div>
            </div>
            <a href="#" class="btn btn-primary mt-2" data-goto="student:activities"><i class="bi bi-plus-circle me-1"></i>หากิจกรรมสมัคร</a>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card p-4">
            <h6 class="mb-3">ประวัติชั่วโมงรายเทอม</h6>
            <table class="table table-sm mb-0"><tbody>${historyRows}</tbody></table>
          </div>
        </div>
      </div>`);

    document.querySelector('[data-goto]').addEventListener('click', (e) => {
      e.preventDefault(); App.navigate('student:activities');
    });
  },

  // ---------- กิจกรรมที่เปิดรับ ----------
  async activities(silent) {
    if (!silent) {
      App.setContent(`
        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
          <h4 class="mb-0">กิจกรรมที่เปิดรับ</h4>
          <div class="d-flex gap-2">
            <input id="act-search" class="form-control form-control-sm" placeholder="ค้นหา..." style="width:180px">
            <select id="act-area" class="form-select form-select-sm" style="width:180px"><option value="">ทุกกลุ่มสาระ</option></select>
            <button id="act-refresh" class="btn btn-sm btn-outline-secondary"><i class="bi bi-arrow-clockwise"></i></button>
          </div>
        </div>
        <div id="act-list" class="row g-3"></div>`);
      document.getElementById('act-search').addEventListener('input', StudentView._renderActivities);
      document.getElementById('act-area').addEventListener('change', StudentView._renderActivities);
      document.getElementById('act-refresh').addEventListener('click', () => StudentView.activities(false));
      App.startPoll(() => StudentView.activities(true)); // poll ที่นั่ง (ADR-0004)
    }

    StudentView._activities = await API.call('listActivities', {}, silent);
    if (!silent) {
      const areas = [...new Set(StudentView._activities.map(a => a.learningArea))].sort();
      const sel = document.getElementById('act-area');
      areas.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; sel.appendChild(o); });
    }
    StudentView._renderActivities();
  },

  _renderActivities() {
    const q = (document.getElementById('act-search')?.value || '').toLowerCase();
    const area = document.getElementById('act-area')?.value || '';
    const list = StudentView._activities.filter(a => {
      if (area && a.learningArea !== area) return false;
      if (q && !(`${a.title} ${a.location} ${a.responsibleTeacher}`.toLowerCase().includes(q))) return false;
      return true;
    });
    const box = document.getElementById('act-list');
    if (!box) return;
    if (!list.length) { box.innerHTML = '<div class="col-12 text-muted text-center py-5">ไม่มีกิจกรรมที่เปิดรับ</div>'; return; }

    box.innerHTML = list.map(a => `
      <div class="col-md-6 col-xl-4">
        <div class="card activity-card h-100 p-3">
          <div class="d-flex justify-content-between">
            <span class="badge text-bg-info mb-2">${UI.escape(a.learningArea)}</span>
            <span class="fw-bold text-primary">${a.hoursAwardedHHMM} ชม.</span>
          </div>
          <h6 class="card-title">${UI.escape(a.title)}</h6>
          <div class="activity-meta mb-2">
            <div><i class="bi bi-calendar3 me-1"></i>${UI.escape(a.date)} · ${UI.escape(a.startTime)}-${UI.escape(a.endTime)} (${a.durationHHMM})</div>
            <div><i class="bi bi-geo-alt me-1"></i>${UI.escape(a.location || '-')}</div>
            <div><i class="bi bi-person me-1"></i>${UI.escape(a.responsibleTeacher || '-')}</div>
          </div>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <small class="${a.isFull ? 'text-danger' : 'text-muted'}">เหลือ ${a.seatsLeft}/${a.capacity} ที่</small>
            ${a.isFull
              ? '<button class="btn btn-sm btn-secondary" disabled>เต็มแล้ว</button>'
              : `<button class="btn btn-sm btn-primary" data-register="${a.activityId}">สมัคร</button>`}
          </div>
        </div>
      </div>`).join('');

    box.querySelectorAll('[data-register]').forEach(btn => {
      btn.addEventListener('click', () => StudentView._register(btn.dataset.register));
    });
  },

  async _register(activityId) {
    if (!confirm('ยืนยันการสมัครกิจกรรมนี้?')) return;
    try {
      await API.call('register', { activityId });
      UI.toast('สมัครสำเร็จ! รอครูอนุมัติหลังกิจกรรมจบ', 'success');
      StudentView.activities(true);
    } catch (e) { UI.toast(e.message, 'danger'); }
  },

  // ---------- ประวัติ/สถานะ ----------
  async mine() {
    const regs = await API.call('myRegistrations');
    const rows = regs.length ? regs.map(r => `
      <tr>
        <td>${UI.escape(r.activityTitle)}</td>
        <td>${UI.escape(r.activityDate)}<br><small class="text-muted">${UI.escape(r.activityStartTime)}-${UI.escape(r.activityEndTime)}</small></td>
        <td>${UI.statusBadge(r.status)}</td>
        <td class="text-end">${r.status === 'approved' ? r.hoursAwardedHHMM + ' ชม.' : '-'}</td>
        <td class="text-end">${r.status === 'pending'
          ? `<button class="btn btn-sm btn-outline-danger" data-withdraw="${r.registrationId}">ถอนตัว</button>` : ''}</td>
      </tr>`).join('') : '<tr><td colspan="5" class="text-center text-muted py-4">ยังไม่มีประวัติการสมัคร</td></tr>';

    App.setContent(`
      <h4 class="mb-3">ประวัติ / สถานะการสมัคร</h4>
      <div class="card p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light"><tr>
              <th>กิจกรรม</th><th>วัน-เวลา</th><th>สถานะ</th><th class="text-end">ชั่วโมง</th><th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`);

    document.querySelectorAll('[data-withdraw]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('ยืนยันถอนตัวจากกิจกรรมนี้?')) return;
        try {
          await API.call('withdraw', { registrationId: btn.dataset.withdraw });
          UI.toast('ถอนตัวแล้ว', 'success');
          StudentView.mine();
        } catch (e) { UI.toast(e.message, 'danger'); }
      });
    });
  }
};
window.StudentView = StudentView;
