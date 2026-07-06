/**
 * api.js — ชั้นเรียก backend (Apps Script Web App)
 * POST body เป็น JSON แต่ Content-Type text/plain เพื่อเลี่ยง CORS preflight (ADR-0001)
 */
const API = {
  /**
   * เรียก action ไปยัง backend
   * @param {string} action
   * @param {object} params
   * @param {boolean} silent - true = ไม่โชว์ loading overlay (ใช้กับ polling)
   */
  async call(action, params = {}, silent = false) {
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
      return json.data;
    } catch (e) {
      if (e.name === 'TypeError') throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบ API_URL หรืออินเทอร์เน็ต');
      throw e;
    } finally {
      if (!silent) UI.hideLoading();
    }
  }
};
