// 게시판/앨범 공통 (Firestore + Cloudinary)
function writeModalHTML(board) {
  const isGallery = board === 'gallery';
  return `
  <div class="modal-back" id="writeBack"><div class="modal">
    <div class="modal-head"><h3>${isGallery ? '사진 올리기' : '글쓰기'}</h3><button class="close-x" id="writeClose">×</button></div>
    <div class="modal-body">
      <div class="field"><label>제목</label><input type="text" id="wTitle" maxlength="100" placeholder="제목"></div>
      <div class="field"><label>내용</label><textarea id="wContent" placeholder="내용을 입력하세요"></textarea></div>
      <div class="field"><label>사진 첨부 ${isGallery ? '(여러 장 가능)' : '(선택)'}</label><input type="file" id="wImages" accept="image/*" multiple></div>
      <div id="wMsg"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" id="writeCancel">취소</button><button class="btn btn-primary" id="writeSubmit">등록</button></div>
  </div></div>`;
}

function detailModalHTML() {
  return `<div class="modal-back" id="detailBack"><div class="modal" style="width:min(720px,100%);">
    <div class="modal-head"><h3>게시글</h3><button class="close-x" id="detailClose">×</button></div>
    <div class="modal-body" id="detailBody"></div>
  </div></div>`;
}

function setupWrite(board, onDone) {
  document.body.insertAdjacentHTML('beforeend', writeModalHTML(board));
  const back = document.getElementById('writeBack');
  const open = () => {
    if (!CURRENT_USER) { location.href = 'login.html'; return; }
    back.classList.add('on');
  };
  const close = () => back.classList.remove('on');
  document.getElementById('writeClose').onclick = close;
  document.getElementById('writeCancel').onclick = close;
  document.getElementById('writeSubmit').onclick = async () => {
    const btn = document.getElementById('writeSubmit');
    const msg = document.getElementById('wMsg');
    const title = document.getElementById('wTitle').value.trim();
    const content = document.getElementById('wContent').value.trim();
    if (!title) { msg.innerHTML = `<div class="notice" style="border-color:#c0392b;color:#c0392b;">제목을 입력하세요.</div>`; return; }
    btn.disabled = true; btn.textContent = '올리는 중…';
    try {
      const files = [...document.getElementById('wImages').files];
      const images = [];
      for (const f of files.slice(0, 10)) {
        const up = await uploadToCloudinary(f);
        images.push(up.secure_url);
      }
      await db.collection('posts').add({
        board, title, content, images,
        authorUid: CURRENT_USER.uid,
        authorName: CURRENT_USER.name,
        views: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      close();
      document.getElementById('wTitle').value = '';
      document.getElementById('wContent').value = '';
      document.getElementById('wImages').value = '';
      onDone && onDone();
    } catch (e) {
      msg.innerHTML = `<div class="notice" style="border-color:#c0392b;color:#c0392b;">${esc(e.message)}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = '등록';
    }
  };
  return open;
}

function setupDetail(onChange) {
  document.body.insertAdjacentHTML('beforeend', detailModalHTML());
  const back = document.getElementById('detailBack');
  document.getElementById('detailClose').onclick = () => back.classList.remove('on');
  back.onclick = (e) => { if (e.target === back) back.classList.remove('on'); };

  async function render(id) {
    const ref = db.collection('posts').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return;
    const p = { id: snap.id, ...snap.data() };
    ref.update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
    const csnap = await ref.collection('comments').orderBy('createdAt').get();
    const comments = csnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const canDelete = CURRENT_USER && (CURRENT_USER.uid === p.authorUid || CURRENT_USER.isAdmin);
    const imgs = (p.images || []).map(src => `<img src="${esc(src)}" loading="lazy">`).join('');
    const commentHtml = comments.map(c => `
      <div class="comment"><div class="meta">${esc(c.authorName)} · ${fmtDate(c.createdAt)}
        ${CURRENT_USER && (CURRENT_USER.uid === c.authorUid || CURRENT_USER.isAdmin) ? `<a href="#" data-del-c="${c.id}" style="color:#c0392b;">삭제</a>` : ''}</div>
        <div>${esc(c.content)}</div></div>`).join('');

    document.getElementById('detailBody').innerHTML = `
      <div class="detail" style="border:none;padding:0;">
        <h1>${esc(p.title)}</h1>
        <div class="meta"><span>${esc(p.authorName)}</span><span>${fmtDate(p.createdAt)}</span><span>조회 ${p.views || 0}</span>
          ${canDelete ? `<a href="#" id="delPost" style="color:#c0392b;font-weight:700;">삭제</a>` : ''}</div>
        <div class="body">${esc(p.content)}</div>
        ${imgs ? `<div class="imgs">${imgs}</div>` : ''}
        <h3 style="margin:2rem 0 0.5rem;font-size:1.1rem;">댓글 ${comments.length}</h3>
        ${commentHtml || '<p class="muted" style="font-size:var(--text-sm);">첫 댓글을 남겨보세요.</p>'}
        ${CURRENT_USER ? `<div style="display:flex;gap:.5rem;margin-top:1rem;">
            <input type="text" id="cInput" placeholder="댓글 입력" style="flex:1;padding:.6rem .8rem;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text);">
            <button class="btn btn-primary btn-sm" id="cSend">등록</button></div>`
          : `<p class="muted" style="font-size:var(--text-sm);margin-top:1rem;"><a href="login.html" style="color:var(--color-primary);font-weight:700;">로그인</a> 후 댓글을 남길 수 있습니다.</p>`}
      </div>`;

    document.getElementById('delPost')?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!confirm('삭제하시겠습니까?')) return;
      const cs = await ref.collection('comments').get();
      await Promise.all(cs.docs.map(d => d.ref.delete()));
      await ref.delete();
      back.classList.remove('on'); onChange && onChange();
    });
    document.querySelectorAll('[data-del-c]').forEach(a => a.addEventListener('click', async (e) => {
      e.preventDefault();
      await ref.collection('comments').doc(a.dataset.delC).delete();
      render(id);
    }));
    document.getElementById('cSend')?.addEventListener('click', async () => {
      const content = document.getElementById('cInput').value.trim();
      if (!content) return;
      await ref.collection('comments').add({
        content,
        authorUid: CURRENT_USER.uid,
        authorName: CURRENT_USER.name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      render(id);
    });
    back.classList.add('on');
  }
  return render;
}

async function loadPosts(board) {
  // 복합 색인 없이 동작하도록: 게시판 필터만 서버에서, 정렬은 브라우저에서
  const snap = await db.collection('posts').where('board', '==', board).limit(300).get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => {
    const ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    const tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return tb - ta; // 최신순
  });
  return list;
}
