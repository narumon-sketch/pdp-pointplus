/**
 * app.js — ตัวควบคุมหลัก: จัดการ login, สร้างเมนูตาม role, สลับ view, polling
 */
const App = {
  state: { user: null, settings: null },
  _pollTimer: null,
  _currentView: null,

  init() {
    document.getElementById('btn-signout').addEventListener('click', () => Auth.signOut());
    // รอ GIS โหลดเสร็จก่อน init
    const wait = setInterval(() => {
      if (window.google && google.accounts && google.accounts.id) {
        clearInterval(wait);
        Auth.init(App.onAuth);
      }
    }, 100);
  },

  async onAuth(profile) {
    if (!profile) return App.showLogin();
    try {
      // เรียกรอบเดียวได้ทั้ง user + settings + ข้อมูล dashboard
      const boot = await API.call('bootstrap');
      App.state.user = boot.user;
      App.state.settings = boot.settings;

      // ป้อน cache ให้หน้าแรกเรนเดอร์ได้ทันทีโดยไม่ยิง server ซ้ำ
      const primed = { me: boot.user, getSettings: boot.settings };
      if (boot.user.role === 'admin') primed.adminDashboard = boot.dashboard;
      else if (boot.user.role === 'teacher') primed.teacherDashboard = boot.dashboard;
      else if (boot.user.role === 'student') primed.myHours = boot.hours;
      API.prime(primed);

      App.showApp();
    } catch (e) {
      UI.toast(e.message, 'danger');
      Auth.signOut();
    }
  },

  showLogin() {
    App.stopPoll();
    document.getElementById('app-view').classList.add('d-none');
    document.getElementById('login-view').classList.remove('d-none');
  },

  showApp() {
    document.getElementById('login-view').classList.add('d-none');
    document.getElementById('app-view').classList.remove('d-none');
    App.renderNav();
    App.navigateDefault();
  },

  /** สร้างเมนูตาม role */
  renderNav() {
    const u = App.state.user;
    const menus = {
      student: [
        { key: 'student:dashboard', label: 'หน้าหลัก', icon: 'house' },
        { key: 'student:activities', label: 'กิจกรรมที่เปิดรับ', icon: 'calendar-event' },
        { key: 'student:mine', label: 'ประวัติ/สถานะ', icon: 'clock-history' }
      ],
      teacher: [
        { key: 'teacher:dashboard', label: 'แดชบอร์ด', icon: 'speedometer2' },
        { key: 'teacher:activities', label: 'กิจกรรมของกลุ่ม', icon: 'calendar2-week' }
      ],
      admin: [
        { key: 'admin:dashboard', label: 'แดชบอร์ด', icon: 'speedometer2' },
        { key: 'admin:users', label: 'ผู้ใช้', icon: 'people' },
        { key: 'admin:areas', label: 'กลุ่มสาระ', icon: 'diagram-3' },
        { key: 'admin:settings', label: 'ตั้งค่าระบบ', icon: 'gear' }
      ]
    };
    const items = menus[u.role] || [];
    document.getElementById('nav-items').innerHTML = items.map(m =>
      `<li class="nav-item">
        <a class="nav-link" href="#" data-view="${m.key}">
          <i class="bi bi-${m.icon} me-1"></i>${m.label}
        </a>
      </li>`).join('');

    document.querySelectorAll('#nav-items [data-view]').forEach(a => {
      a.addEventListener('click', (e) => { e.preventDefault(); App.navigate(a.dataset.view); });
    });

    const areaText = u.learningArea ? ` · ${u.learningArea}` : '';
    document.getElementById('nav-user').textContent =
      `${u.fullName || Auth.getProfile().name || u.email} (${App.roleLabel(u.role)}${areaText})`;
  },

  roleLabel(role) {
    return { admin: 'ผู้ดูแล', teacher: 'ครู', student: 'นักเรียน' }[role] || role;
  },

  navigateDefault() {
    const def = { student: 'student:dashboard', teacher: 'teacher:dashboard', admin: 'admin:dashboard' };
    App.navigate(def[App.state.user.role]);
  },

  /** สลับ view — key รูปแบบ "module:method" */
  navigate(key, arg) {
    App.stopPoll();
    App._currentView = key;
    document.querySelectorAll('#nav-items .nav-link').forEach(a =>
      a.classList.toggle('active', a.dataset.view === key));
    const [mod, method] = key.split(':');
    const views = { student: window.StudentView, teacher: window.TeacherView, admin: window.AdminView };
    const view = views[mod];
    if (view && typeof view[method] === 'function') {
      view[method](arg);
    } else {
      App.setContent('<div class="alert alert-warning">ไม่พบหน้า</div>');
    }
    window.scrollTo(0, 0);
  },

  setContent(html) { document.getElementById('content').innerHTML = html; },

  /** polling: เรียก fn(true) ทุก interval (fn ควรเป็น silent refresh) */
  startPoll(fn) {
    App.stopPoll();
    App._pollTimer = setInterval(() => {
      if (!document.hidden) fn(true);
    }, APP_CONFIG.POLL_INTERVAL_MS);
  },
  stopPoll() {
    if (App._pollTimer) { clearInterval(App._pollTimer); App._pollTimer = null; }
  },

  /** เปิด Bootstrap modal จาก HTML (คืน instance) */
  showModal(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = html;
    const modalEl = root.querySelector('.modal');
    const modal = new bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', () => { root.innerHTML = ''; });
    modal.show();
    return modal;
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
