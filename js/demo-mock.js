/**
 * demo-mock.js — โหมดตัวอย่าง: แทนที่ Auth + API ด้วยข้อมูลจำลอง
 * เพื่อดูหน้าจอจริงของทั้ง 3 บทบาทโดยไม่ต้อง login/backend
 * (ใช้เฉพาะ demo.html เท่านั้น — ไม่เกี่ยวกับแอปจริง index.html)
 */
// stub ให้ app.js ผ่านเงื่อนไขรอ GIS (โหมด demo ไม่โหลด Google library)
window.google = { accounts: { id: { initialize() {}, renderButton() {}, prompt() {}, disableAutoSelect() {} } } };

const DEMO = { role: 'student' };
DEMO.name = function () {
  return { student: 'สมชาย ใจดี', teacher: 'กลุ่มสาระวิทยาศาสตร์ฯ', admin: 'ผู้ดูแลระบบ' }[DEMO.role];
};

// ---------- Mock Auth ----------
const Auth = {
  _cb: null,
  init(cb) { Auth._cb = cb; DEMO.render(); },
  getIdToken() { return 'demo'; },
  getProfile() { return { name: DEMO.name() }; },
  isSignedIn() { return true; },
  signOut() { if (Auth._cb) Auth._cb(null); }
};
DEMO.render = function () { if (Auth._cb) Auth._cb({ name: DEMO.name() }); };
DEMO.setRole = function (role) {
  DEMO.role = role;
  document.querySelectorAll('#demo-bar button').forEach(b =>
    b.classList.toggle('active', b.dataset.role === role));
  DEMO.render();
};
window.Auth = Auth;

// ---------- ข้อมูลจำลอง ----------
DEMO.data = {
  me: {
    student: { email: 'somchai@stu.pdp.ac.th', role: 'student', learningArea: '', fullName: 'สมชาย ใจดี', gradeLevel: 'ม.1', room: '1', studentNo: '5', status: 'active' },
    teacher: { email: 'science@pdp.ac.th', role: 'teacher', learningArea: 'วิทยาศาสตร์และเทคโนโลยี', fullName: 'กลุ่มสาระวิทยาศาสตร์ฯ', status: 'active' },
    admin:   { email: 'narumon@pdp.ac.th', role: 'admin', learningArea: '', fullName: 'ผู้ดูแลระบบ', status: 'active' }
  },
  settings: { currentAcademicYear: '2568', currentTerm: '1', targetHoursPerTerm: '7:30', targetMinutes: 450, schoolName: 'โรงเรียนพีดีพี', logoUrl: '' },
  activities: [
    { activityId: 'A1', learningArea: 'วิทยาศาสตร์และเทคโนโลยี', title: 'ปลูกป่าชายเลน', description: 'ช่วยกันปลูกป่า', location: 'ชายหาดบางแสน', hoursAwarded: 2, hoursAwardedHHMM: '2:00', date: '2568-07-10', startTime: '09:00', endTime: '11:00', durationMinutes: 120, durationHHMM: '2:00', capacity: 30, responsibleTeacher: 'ครูสมศรี', status: 'open', academicYear: '2568', term: '1', pendingCount: 25, approvedCount: 0, seatsLeft: 5, isFull: false, isPast: false, isOpenForRegistration: true },
    { activityId: 'A2', learningArea: 'วิทยาศาสตร์และเทคโนโลยี', title: 'ค่ายวิทยาศาสตร์', description: 'ทดลองสนุก', location: 'ห้องปฏิบัติการ', hoursAwarded: 1.5, hoursAwardedHHMM: '1:30', date: '2568-07-15', startTime: '13:00', endTime: '14:30', durationMinutes: 90, durationHHMM: '1:30', capacity: 20, responsibleTeacher: 'ครูวิชัย', status: 'open', academicYear: '2568', term: '1', pendingCount: 20, approvedCount: 0, seatsLeft: 0, isFull: true, isPast: false, isOpenForRegistration: false },
    { activityId: 'A3', learningArea: 'วิทยาศาสตร์และเทคโนโลยี', title: 'เก็บขยะรีไซเคิล', description: '', location: 'รอบโรงเรียน', hoursAwarded: 1, hoursAwardedHHMM: '1:00', date: '2568-07-02', startTime: '08:00', endTime: '09:00', durationMinutes: 60, durationHHMM: '1:00', capacity: 40, responsibleTeacher: 'ครูสมศรี', status: 'closed', academicYear: '2568', term: '1', pendingCount: 18, approvedCount: 15, seatsLeft: 22, isFull: false, isPast: true, isOpenForRegistration: false }
  ],
  myHours: { currentAcademicYear: '2568', currentTerm: '1', currentMinutes: 330, currentHHMM: '5:30', targetMinutes: 450, targetHHMM: '7:30', reached: false, remainingMinutes: 120,
    history: [{ academicYear: '2568', term: '1', minutes: 330, hhmm: '5:30' }, { academicYear: '2567', term: '2', minutes: 480, hhmm: '8:00' }] },
  myRegs: [
    { registrationId: 'R1', activityId: 'A3', status: 'approved', hoursAwardedHHMM: '1:00', activityTitle: 'เก็บขยะรีไซเคิล', activityDate: '2568-07-02', activityStartTime: '08:00', activityEndTime: '09:00' },
    { registrationId: 'R2', activityId: 'A1', status: 'pending', hoursAwardedHHMM: '0:00', activityTitle: 'ปลูกป่าชายเลน', activityDate: '2568-07-10', activityStartTime: '09:00', activityEndTime: '11:00' }
  ],
  regsOfActivity: [
    { registrationId: 'R1', studentName: 'สมชาย ใจดี', classSnapshot: 'ม.1/1', studentNoSnapshot: '5', status: 'pending', hoursAwardedHHMM: '0:00' },
    { registrationId: 'R3', studentName: 'สมหญิง รักเรียน', classSnapshot: 'ม.1/1', studentNoSnapshot: '12', status: 'pending', hoursAwardedHHMM: '0:00' },
    { registrationId: 'R4', studentName: 'มานะ ตั้งใจ', classSnapshot: 'ม.2/3', studentNoSnapshot: '8', status: 'approved', hoursAwardedHHMM: '1:00' }
  ],
  areas: [
    { areaId: 'LA3', name: 'วิทยาศาสตร์และเทคโนโลยี', accountEmail: 'science@pdp.ac.th', teacherRoster: ['ครูสมศรี', 'ครูวิชัย'], active: true },
    { areaId: 'LA2', name: 'คณิตศาสตร์', accountEmail: 'math@pdp.ac.th', teacherRoster: ['ครูมานี'], active: true },
    { areaId: 'LA1', name: 'ภาษาไทย', accountEmail: '', teacherRoster: [], active: true }
  ],
  users: [
    { email: 'somchai@stu.pdp.ac.th', role: 'student', learningArea: '', fullName: 'สมชาย ใจดี', gradeLevel: 'ม.1', room: '1', studentNo: '5', status: 'active' },
    { email: 'somying@stu.pdp.ac.th', role: 'student', learningArea: '', fullName: 'สมหญิง รักเรียน', gradeLevel: 'ม.1', room: '1', studentNo: '12', status: 'active' },
    { email: 'science@pdp.ac.th', role: 'teacher', learningArea: 'วิทยาศาสตร์และเทคโนโลยี', fullName: 'กลุ่มสาระวิทยาศาสตร์ฯ', gradeLevel: '', room: '', studentNo: '', status: 'active' }
  ]
};

// ---------- Mock API ----------
const API = {
  async call(action, params = {}) {
    const d = DEMO.data;
    switch (action) {
      case 'me': return d.me[DEMO.role];
      case 'getSettings': return d.settings;
      case 'myHours': return d.myHours;
      case 'myRegistrations': return d.myRegs;
      case 'listActivities': return d.activities;
      case 'listRegistrations': return d.regsOfActivity;
      case 'listLearningAreas': return d.areas;
      case 'listUsers': return d.users;
      case 'teacherDashboard': return { learningArea: 'วิทยาศาสตร์และเทคโนโลยี', academicYear: '2568', term: '1', activityCount: 3, pendingCount: 27, applicantCount: 63 };
      case 'adminDashboard': return {
        academicYear: '2568', term: '1', targetHHMM: '7:30',
        userCounts: { student: 312, teacher: 8, admin: 2, graduated: 45 },
        activityCount: 18, activityByArea: { 'วิทยาศาสตร์และเทคโนโลยี': 6, 'คณิตศาสตร์': 4, 'ภาษาไทย': 3, 'สังคมศึกษา ศาสนาและวัฒนธรรม': 5 },
        pendingTotal: 41,
        reachedByGrade: [
          { gradeLevel: 'ม.1', total: 52, reached: 47, notReached: 5, percent: 90 },
          { gradeLevel: 'ม.2', total: 48, reached: 30, notReached: 18, percent: 63 },
          { gradeLevel: 'ม.3', total: 50, reached: 41, notReached: 9, percent: 82 }
        ]
      };
      case 'hoursReport': return {
        academicYear: '2568', term: '1', targetHHMM: '7:30',
        rows: [
          { className: 'ม.1/1', studentNo: '5', fullName: 'สมชาย ใจดี', email: 'somchai@stu.pdp.ac.th', hoursHHMM: '5:30', reached: 'ยังไม่ถึง' },
          { className: 'ม.1/1', studentNo: '12', fullName: 'สมหญิง รักเรียน', email: 'somying@stu.pdp.ac.th', hoursHHMM: '8:00', reached: 'ถึงเป้า' }
        ]
      };
      default: return { ok: true }; // สมัคร/อนุมัติ/สร้าง/แก้/ลบ ฯลฯ
    }
  }
};
window.API = API;
