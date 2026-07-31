/**
 * api.js — ชั้นเรียก backend (Apps Script Web App)
 * POST body เป็น JSON แต่ Content-Type text/plain เพื่อเลี่ยง CORS preflight (ADR-0001)
 */
const API = {
  // cache แบบใช้ครั้งเดียว ป้อนจาก bootstrap เพื่อให้หน้าแรกไม่ต้องยิง server ซ้ำ
  _primed: {},
  prime(map) { API._primed = map || {}; },

  // ----- cache ฝั่ง client (ลดการยิง server ซ้ำตอนสลับเมนู) -----
  _cache: new Map(),          // key -> { data, ts }
  CACHE_TTL_MS: 60000,        // อายุ cache 60 วินาที

  // action ที่เป็นการ "อ่าน" เท่านั้น จึง cache ได้ปลอดภัย (ตรงกับ dispatch ใน Code.gs)
  READ_ACTIONS: new Set([
    'me', 'getSettings', 'listUsers', 'listLearningAreas',
    'listActivities', 'getActivity', 'listRegistrations',
    'myRegistrations', 'myHours', 'teacherDashboard', 'adminDashboard', 'hoursReport'
  ]),

  /** ล้าง cache ทั้งหมด (เรียกตอนออกจากระบบ) */
  clearCache() { API._cache.clear(); },

  /**
   * เรียก action ไปยัง backend
   * @param {string} action
   * @param {object} params
   * @param {boolean} silent - true = ไม่โชว์ loading overlay + ข้าม cache (ใช้กับ polling ให้ได้ข้อมูลสด)
   */
  async call(action, params = {}, silent = false) {
    // ถ้ามีข้อมูลที่ป้อนไว้ล่วงหน้า (จาก bootstrap) คืนทันที ไม่ต้องเรียก server
    if (Object.prototype.hasOwnProperty.call(API._primed, action)) {
      const cached = API._primed[action];
      delete API._primed[action];
      // ป้อนเข้า cache ปกติด้วย เพื่อให้กลับมาหน้าเดิมยังใช้ได้
      if (API.READ_ACTIONS.has(action)) API._cache.set(API._key(action, params), { data: cached, ts: Date.now() });
      return cached;
    }

    const isRead = API.READ_ACTIONS.has(action);
    const key = API._key(action, params);

    // อ่านจาก cache ได้ถ้ายังไม่หมดอายุ และไม่ใช่การเรียกแบบ silent (polling ต้องการข้อมูลสด)
    if (isRead && !silent) {
      const hit = API._cache.get(key);
      if (hit && (Date.now() - hit.ts) < API.CACHE_TTL_MS) return hit.data;
    }

    if (!silent) UI.showLoading();
    try {
      const idToken = Auth.getIdToken();
      const body = JSON.stringify(Object.assign({ action, idToken }, params));
      const res = await fetch(APP_CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body
      });
      const json = await res.json();
      if (!json.ok) {
        const err = json.error || { message: 'เกิดข้อผิดพลาด' };
        // token หมดอายุ/ไม่ผ่าน → ให้ login ใหม่
        if (err.status === 401) { Auth.signOut(); }
        throw new Error(err.message || 'เกิดข้อผิดพลาด');
      }
      // เก็บ cache ถ้าเป็นการอ่าน; ถ้าเป็นการเขียน (mutation) ล้าง cache เพื่อให้ครั้งต่อไปได้ข้อมูลใหม่
      if (isRead) API._cache.set(key, { data: json.data, ts: Date.now() });
      else if (action !== 'ping') API._cache.clear();
      return json.data;
    } catch (e) {
      if (e.name === 'TypeError') throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบ API_URL หรืออินเทอร์เน็ต');
      throw e;
    } finally {
      if (!silent) UI.hideLoading();
    }
  },

  /** สร้าง cache key จาก action + params */
  _key(action, params) { return action + '|' + JSON.stringify(params || {}); }
};
