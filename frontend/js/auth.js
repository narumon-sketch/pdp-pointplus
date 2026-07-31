/**
 * auth.js — Google Identity Services (GIS): login แล้วเก็บ ID token (JWT)
 * (ตาม ADR-0001)
 */
const Auth = {
  _idToken: null,
  _profile: null,
  _onChange: null,

  /** เริ่มต้น GIS + วาดปุ่ม login; onChange(user|null) ถูกเรียกเมื่อสถานะเปลี่ยน */
  init(onChange) {
    Auth._onChange = onChange;
    google.accounts.id.initialize({
      client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
      callback: Auth._handleCredential,
      auto_select: false
    });
    google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill', locale: 'th' }
    );
    // ใช้ปุ่มที่แสดงเป็นหลัก (ไม่เรียก One Tap prompt() เพื่อไม่ให้เด้ง popup รบกวน)
  },

  /** callback เมื่อ login สำเร็จ — ได้ credential (JWT) */
  _handleCredential(response) {
    Auth._idToken = response.credential;
    Auth._profile = Auth._decodeJwt(response.credential);
    if (Auth._onChange) Auth._onChange(Auth._profile);
  },

  getIdToken() { return Auth._idToken; },
  getProfile() { return Auth._profile; },
  isSignedIn() { return !!Auth._idToken; },

  signOut() {
    Auth._idToken = null;
    Auth._profile = null;
    try { google.accounts.id.disableAutoSelect(); } catch (e) {}
    if (Auth._onChange) Auth._onChange(null);
  },

  /** decode payload ของ JWT (ใช้แค่แสดงชื่อ/รูป ไม่ใช่เพื่อความปลอดภัย) */
  _decodeJwt(jwt) {
    try {
      const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(payload))));
    } catch (e) { return {}; }
  }
};
