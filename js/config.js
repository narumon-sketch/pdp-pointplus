/**
 * config.js — ค่าตั้งค่า frontend
 * แก้ 2 ค่านี้หลัง deploy backend และสร้าง OAuth Client ID
 */
const APP_CONFIG = {
  // Web app URL จาก Apps Script (ลงท้าย /exec)
  API_URL: 'https://script.google.com/macros/s/AKfycbxbuePA-HhnGLoFjNYP1WKWwgQaEnBdh82GUvAmSJymI3ygsNQT4ZorhQqM9CBZas9o/exec',

  // OAuth 2.0 Client ID (Web application) — ต้องตรงกับที่ตั้งใน backend Config.gs
  GOOGLE_CLIENT_ID: '469738891951-3reljbshp15a0fnjmqr2h18iu0e7evru.apps.googleusercontent.com',

  // polling interval (ms) สำหรับหน้าที่ไวต่อเวลา (ที่นั่ง/คิวอนุมัติ) — ADR-0004
  POLL_INTERVAL_MS: 30000
};
