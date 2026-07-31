/**
 * openExternal.js — เปิดแอปในเบราว์เซอร์จริง (ค่าเริ่มต้น Google Chrome; ถ้าไม่มีใช้เบราว์เซอร์ของเครื่อง)
 *
 * เหตุผล: เมื่อกดลิงก์จาก LINE / Facebook / Instagram ฯลฯ หน้าจะเปิดใน
 * "in-app browser" (WebView ในตัวแอป) ซึ่ง Google Sign-In จะถูกบล็อก
 * (error: disallowed_useragent) ทำให้เข้าสู่ระบบไม่ได้ + มักโหลดช้า
 *
 * กลยุทธ์ (ทำงานทันทีก่อนสคริปต์อื่น):
 *  - LINE      → เติม ?openExternalBrowser=1 ให้ LINE เปิดเบราว์เซอร์เริ่มต้นของเครื่องเอง
 *  - Android   → intent:// เปิด Chrome; ถ้าไม่มี Chrome ตกไปเบราว์เซอร์เริ่มต้น (browser_fallback_url)
 *  - iOS       → googlechrome(s):// เปิด Chrome; ถ้าไม่มี → แสดงคำแนะนำเปิดใน Safari
 *  - เบราว์เซอร์ปกติ (Chrome/Safari/Edge/…) → ไม่ทำอะไร
 */
(function () {
  'use strict';

  var ua = navigator.userAgent || navigator.vendor || '';
  var href = window.location.href;

  // ---- ตรวจจับ in-app browser ที่ต้องเด้งออก ----
  var isLine      = /\bLine\//i.test(ua);
  var isFacebook  = /\bFB[A-Z_]+\/|FB_IAB|FBAN|FBAV/i.test(ua);
  var isInstagram = /Instagram/i.test(ua);
  var isMessenger = /Messenger/i.test(ua);
  var isTikTok    = /musical_ly|BytedanceWebview|TikTok/i.test(ua);
  var inApp = isLine || isFacebook || isInstagram || isMessenger || isTikTok;

  if (!inApp) return; // เบราว์เซอร์ปกติ — ปล่อยผ่าน

  var isIOS     = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);

  // กันวนซ้ำ: ถ้าเคยพยายามเด้งแล้วยังกลับมาที่ WebView เดิม → แสดงคำแนะนำแทน
  try {
    var u = new URL(href);
    if (u.searchParams.get('ext') === '1') { showManualFallback(); return; }
  } catch (e) { /* URL API ไม่รองรับ — เดินหน้าต่อ */ }

  // ---------- LINE ----------
  if (isLine) {
    var sep = href.indexOf('?') === -1 ? '?' : '&';
    // LINE จะจับ param นี้แล้วเปิดเบราว์เซอร์เริ่มต้นของเครื่องให้เอง
    window.location.href = href + sep + 'openExternalBrowser=1';
    return;
  }

  // ---------- Android (Facebook / IG / Messenger / TikTok) ----------
  if (isAndroid) {
    var targetA = withExtFlag(href);
    var noScheme = targetA.replace(/^https?:\/\//i, '');
    var intentUrl = 'intent://' + noScheme +
      '#Intent;scheme=https;package=com.android.chrome;' +
      'S.browser_fallback_url=' + encodeURIComponent(targetA) + ';end';
    window.location.href = intentUrl; // มี Chrome → เปิด Chrome; ไม่มี → เบราว์เซอร์เริ่มต้น
    setTimeout(showManualFallback, 2000);
    return;
  }

  // ---------- iOS (Facebook / IG / Messenger / TikTok) ----------
  if (isIOS) {
    var targetI = withExtFlag(href);
    var scheme = (targetI.indexOf('https') === 0 ? 'googlechromes://' : 'googlechrome://');
    window.location.href = scheme + targetI.replace(/^https?:\/\//i, '');
    // iOS บังคับออกจาก WebView ไม่ได้เสมอ — ถ้าไม่มี Chrome จะยังอยู่ที่เดิม → แนะนำเปิด Safari
    setTimeout(showManualFallback, 1500);
    return;
  }

  // อื่น ๆ ที่ระบุ OS ไม่ได้
  showManualFallback();

  // ---------- helpers ----------
  function withExtFlag(u) {
    var sep = u.indexOf('?') === -1 ? '?' : '&';
    return u + sep + 'ext=1';
  }

  /** แสดงหน้าคำแนะนำเมื่อเด้งอัตโนมัติไม่สำเร็จ (เช่น ไม่มี Chrome / iOS in-app) */
  function showManualFallback() {
    if (!document.body) { document.addEventListener('DOMContentLoaded', showManualFallback); return; }
    if (document.getElementById('open-external-fallback')) return;

    var box = document.createElement('div');
    box.id = 'open-external-fallback';
    box.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:#0d6efd', 'color:#fff',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'text-align:center', 'padding:24px',
      'font-family:"Sarabun",system-ui,-apple-system,sans-serif',
      'line-height:1.6'
    ].join(';'));

    var tip = isIOS
      ? 'กดปุ่มเมนู <b>•••</b> (มุมขวาบน) แล้วเลือก <b>“เปิดในเบราว์เซอร์”</b> หรือ <b>“Open in Safari”</b>'
      : 'กดปุ่มเมนู <b>⋮</b> (มุมขวาบน) แล้วเลือก <b>“เปิดในเบราว์เซอร์”</b> หรือ <b>“Open in Chrome”</b>';

    box.innerHTML =
      '<div style="font-size:44px;margin-bottom:8px">🌐</div>' +
      '<h2 style="margin:0 0 8px;font-size:22px;font-weight:700">เปิดในเบราว์เซอร์เพื่อเข้าสู่ระบบ</h2>' +
      '<p style="margin:0 0 20px;max-width:420px;opacity:.95">' +
        'เพื่อให้เข้าสู่ระบบด้วย Google ได้ กรุณาเปิดหน้านี้ในเบราว์เซอร์ของเครื่อง<br>' +
        '(แนะนำ Google Chrome)</p>' +
      '<div style="background:rgba(255,255,255,.15);border-radius:12px;padding:14px 18px;max-width:420px;margin-bottom:20px;font-size:15px">' +
        tip + '</div>' +
      '<button id="oe-copy" style="background:#fff;color:#0d6efd;border:0;border-radius:999px;' +
        'padding:12px 28px;font-size:16px;font-weight:700;cursor:pointer">📋 คัดลอกลิงก์</button>' +
      '<p id="oe-copied" style="margin-top:12px;height:20px;opacity:0;transition:opacity .2s">คัดลอกแล้ว ✓</p>';

    document.body.appendChild(box);

    var cleanHref = href.replace(/([?&])(ext|openExternalBrowser)=1(&|$)/g, '$1').replace(/[?&]$/, '');
    document.getElementById('oe-copy').addEventListener('click', function () {
      var done = function () {
        var c = document.getElementById('oe-copied');
        if (c) { c.style.opacity = '1'; setTimeout(function () { c.style.opacity = '0'; }, 1800); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanHref).then(done, fallbackCopy);
      } else { fallbackCopy(); }
      function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = cleanHref; ta.setAttribute('readonly', '');
        ta.style.position = 'absolute'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }
})();
