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
  _refreshing: new Set(),     // key ที่กำลัง refresh เบื้องหลัง (กันยิงซ้ำ)
  CACHE_TTL_MS: 600000,       // อายุ cache 10 นาที (ตรงกับ backend)

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

    // ----- SWR (stale-while-revalidate) สำหรับ read action ปกติ -----
    // มี cache อยู่ → คืนทันที (ไม่ต้องรอ backend ที่อาจช้า); ถ้าเก่าเกิน TTL ค่อย refresh เงียบ ๆ ไว้ใช้ครั้งหน้า
    if (isRead && !silent) {
      const hit = API._cache.get(key);
      if (hit) {
        if ((Date.now() - hit.ts) >= API.CACHE_TTL_MS) API._bgRefresh(action, params, key);
        return hit.data;
      }
    }

    // ไม่มี cache → ต้องยิง backend จริง (รอผล)
    if (!silent) UI.showLoading();
    try {
      const data = await API._fetch(action, params);
      if (isRead) API._cache.set(key, { data, ts: Date.now() });
      else if (action !== 'ping') API._cache.clear();   // mutation → ล้าง cache
      return data;
    } finally {
      if (!silent) UI.hideLoading();
    }
  },

  /** ยิง backend จริง (ชั้น network ล้วน ๆ) — คืน data หรือโยน error */
  async _fetch(action, params) {
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
        if (err.status === 401) { Auth.signOut(); }
        throw new Error(err.message || 'เกิดข้อผิดพลาด');
      }
      return json.data;
    } catch (e) {
      if (e.name === 'TypeError') throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบ API_URL หรืออินเทอร์เน็ต');
      throw e;
    }
  },

  /** refresh cache เบื้องหลัง (ไม่โชว์ loading, ไม่รอผล) */
  _bgRefresh(action, params, key) {
    if (API._refreshing.has(key)) return;
    API._refreshing.add(key);
    API._fetch(action, params)
      .then(data => API._cache.set(key, { data, ts: Date.now() }))
      .catch(() => {})
      .then(() => API._refreshing.delete(key));
  },

  /**
   * โหลดข้อมูลหน้าอื่นไว้ล่วงหน้าเบื้องหลัง (เข้า cache) — กดเมนูครั้งแรกจะได้ทันที
   * @param {Array<{action:string, params?:object}>} list
   */
  prefetch(list) {
    (list || []).forEach(item => {
      const key = API._key(item.action, item.params || {});
      if (API._cache.has(key) || API._refreshing.has(key)) return;   // มีแล้ว/กำลังโหลด → ข้าม
      API._bgRefresh(item.action, item.params || {}, key);
    });
  },

  /** สร้าง cache key จาก action + params */
  _key(action, params) { return action + '|' + JSON.stringify(params || {}); }
};
