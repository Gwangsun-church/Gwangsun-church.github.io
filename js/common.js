// 공통: Firebase 초기화, 테마, 헤더/푸터, 로그인 상태
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let CURRENT_USER = null; // { uid, name, email, photo, isAdmin }

const Nav = [
  { href: 'index.html', label: '홈' },
  { href: 'index.html#about', label: '교회소개' },
  { href: 'index.html#worship', label: '예배안내' },
  { href: 'news.html', label: '교회소식' },
  { href: 'index.html#sermons', label: '설교영상' },
  { label: '성도의 교제', children: [
    { href: 'album.html', label: '은혜앨범' },
    { href: 'share.html', label: '은혜나누기' },
  ] },
  { href: 'index.html#visit', label: '오시는길' },
];

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function fmtDate(ts) {
  try {
    const d = ts && ts.toDate ? ts.toDate() : new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  } catch { return ''; }
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}

// Cloudinary 업로드 (이미지/PDF 공용)
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY.uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('업로드 실패 (' + res.status + ')');
  return res.json(); // { secure_url, public_id, pages(PDF일 때), format, ... }
}

// Cloudinary PDF의 n쪽을 이미지 URL로
function pdfPageUrl(publicId, n, width) {
  return `https://res.cloudinary.com/${CLOUDINARY.cloudName}/image/upload/pg_${n},f_jpg,w_${width || 1400}/${publicId}.jpg`;
}

function renderChrome() {
  applyTheme(localStorage.getItem('theme') || 'light');

  const topHTML = `
    <div class="topbar"><div class="container topbar-inner">
      <div>주일예배 오전 10:40 <span class="dot">·</span> 수요예배 오후 8:00 <span class="dot">·</span> 새벽기도 오전 5:30</div>
      <div>울산광역시 동구 · 광선교회 · 052-235-5004</div>
    </div></div>
    <header class="site-header"><div class="container header-inner">
      <a href="index.html" class="brand" aria-label="광선침례교회 홈">
        <img class="brand-logo" src="img/icon-192.png" alt="광선침례교회 로고" width="46" height="46">
        <span class="brand-copy"><small>KWANGSUN BAPTIST CHURCH</small><strong>광선침례교회</strong></span>
      </a>
      <nav class="nav" id="mainNav">${Nav.map(n => n.children
        ? `<div class="nav-dd"><a href="#" class="nav-dd-top">${n.label} <span class="caret">▾</span></a>
            <div class="nav-dd-menu">${n.children.map(c => `<a href="${c.href}">${c.label}</a>`).join('')}</div></div>`
        : `<a href="${n.href}">${n.label}</a>`).join('')}</nav>
      <div class="header-actions">
        <span id="authArea"></span>
        <button class="theme-toggle" id="themeBtn" aria-label="다크모드">☼</button>
        <button class="menu-toggle" id="menuBtn" aria-label="메뉴">☰</button>
      </div>
    </div></header>`;

  const footHTML = `
    <footer class="footer"><div class="container footer-grid">
      <div>
        <strong>${CHURCH.fullName}</strong>
        <p>${CHURCH.slogan}</p>
        <p>${CHURCH.address} · 우 ${CHURCH.zipcode}</p>
        <p>TEL ${CHURCH.tel} · 온라인헌금 ${CHURCH.account}</p>
      </div>
      <div>
        <p><a href="${YOUTUBE.channelUrl}" target="_blank" rel="noopener">유튜브 ${YOUTUBE.handle} →</a></p>
        <p>담임 ${CHURCH.pastor} · 창립 ${CHURCH.founded}</p>
        <p style="margin-top:0.8rem;">© ${new Date().getFullYear()} Kwangsun Baptist Church</p>
      </div>
    </div></footer>`;

  const head = document.getElementById('site-top');
  const foot = document.getElementById('site-foot');
  if (head) head.innerHTML = topHTML;
  if (foot) foot.innerHTML = footHTML;

  document.getElementById('themeBtn')?.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('menuBtn')?.addEventListener('click', () => {
    document.getElementById('mainNav')?.classList.toggle('open');
  });
  document.querySelectorAll('.nav-dd-top').forEach(top => {
    top.addEventListener('click', (e) => { e.preventDefault(); top.closest('.nav-dd').classList.toggle('open'); });
  });

  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#mainNav a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    if (href.split('#')[0] === here && !href.includes('#')) a.classList.add('active');
  });

  // 맨 위로(Top) 버튼 — 모든 페이지 우측 하단 고정
  const topBtn = document.createElement('button');
  topBtn.className = 'top-btn';
  topBtn.setAttribute('aria-label', '맨 위로');
  topBtn.innerHTML = '↑';
  document.body.appendChild(topBtn);
  topBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const toggleTop = () => topBtn.classList.toggle('show', window.scrollY > 300);
  window.addEventListener('scroll', toggleTop, { passive: true });
  toggleTop();
}

function renderAuthArea() {
  const area = document.getElementById('authArea');
  if (!area) return;
  if (CURRENT_USER) {
    area.innerHTML = `<span style="font-size:var(--text-sm);font-weight:700;">${esc(CURRENT_USER.name)}님${CURRENT_USER.isAdmin ? ' <span style="color:var(--color-primary);">(관리자)</span>' : ''}</span>
      <button class="btn btn-ghost btn-sm" id="logoutBtn" style="margin-left:.4rem;">로그아웃</button>`;
    document.getElementById('logoutBtn').onclick = () => auth.signOut().then(() => location.reload());
  } else {
    area.innerHTML = `<a class="btn btn-primary btn-sm" href="login.html">로그인</a>`;
  }
}

// 로그인 상태 추적 + 페이지별 초기화 콜백
const _readyCallbacks = [];
function onUserReady(cb) { _readyCallbacks.push(cb); }

auth.onAuthStateChanged(user => {
  if (user) {
    CURRENT_USER = {
      uid: user.uid,
      name: user.displayName || '회원',
      email: user.email || '',
      photo: user.photoURL || null,
      isAdmin: ADMIN_EMAILS.includes(user.email || ''),
    };
  } else {
    CURRENT_USER = null;
  }
  renderAuthArea();
  while (_readyCallbacks.length) { try { _readyCallbacks.shift()(CURRENT_USER); } catch (e) { console.error(e); } }
});

function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return auth.signInWithPopup(provider).catch(err => {
    // 팝업이 차단되면(일부 휴대폰) 리다이렉트 방식으로 재시도
    if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request')) {
      return auth.signInWithRedirect(provider);
    }
    throw err;
  });
}

document.addEventListener('DOMContentLoaded', renderChrome);
