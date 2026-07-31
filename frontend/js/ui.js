/**
 * ui.js — helper ส่วนแสดงผล: toast, loading, escape, format
 */
const UI = {
  /** แสดง toast (type: success | danger | warning | info) */
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const id = 't' + Date.now();
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${UI.escape(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(el);
    el.querySelector('.btn-close').addEventListener('click', () => el.remove());
    setTimeout(() => el.remove(), 4000);
  },

  /** overlay loading (นับซ้อนได้) */
  _loadingCount: 0,
  showLoading() {
    UI._loadingCount++;
    document.getElementById('loading-overlay').classList.remove('d-none');
  },
  hideLoading() {
    UI._loadingCount = Math.max(0, UI._loadingCount - 1);
    if (UI._loadingCount === 0) document.getElementById('loading-overlay').classList.add('d-none');
  },

  /** กัน XSS ตอนใส่ข้อความลง innerHTML */
  escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  /** แปลงทศนิยมชั่วโมง -> "H:MM" */
  hoursToHHMM(dec) {
    const total = Math.round((Number(dec) || 0) * 60);
    const h = Math.floor(total / 60), m = total % 60;
    return `${h}:${m < 10 ? '0' + m : m}`;
  },

  /** badge สีตามสถานะ registration */
  statusBadge(status) {
    const map = {
      pending: ['warning', 'รออนุมัติ'], approved: ['success', 'อนุมัติแล้ว'],
      rejected: ['danger', 'ไม่อนุมัติ'], withdrawn: ['secondary', 'ถอนตัว']
    };
    const [color, label] = map[status] || ['secondary', status];
    return `<span class="badge text-bg-${color}">${label}</span>`;
  }
};
