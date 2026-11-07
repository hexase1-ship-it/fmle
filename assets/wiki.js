// FMLE user wiki (wiki/build.py): theme, search over search.json, the narrow-screen menu, this page's headings and
// screenshot zoom. No libraries.
(() => {
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;

  // theme: the visitor's choice, else the system's
  $('#theme-btn').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('fmle-wiki-theme', root.dataset.theme);
  });

  // narrow screens: the table of contents slides in
  const menu = $('#menu-btn');
  menu.addEventListener('click', () => {
    const on = document.body.classList.toggle('is-menu');
    menu.setAttribute('aria-expanded', String(on));
  });
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('is-menu') && !e.target.closest('#side, #menu-btn')) {
      document.body.classList.remove('is-menu'); menu.setAttribute('aria-expanded', 'false');
    }
  });
  $('#side .is-on')?.scrollIntoView({ block: 'center' });

  // search: titles and headings first, then the text, with a few words of context
  const q = $('#q'), box = $('#results');
  let index = null, hits = [], cur = -1;
  const fold = (s) => s.toLowerCase().replace(/\s+/g, '');
  const load = () => index || (index = fetch('search.json').then((r) => r.json()));
  const escH = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const around = (text, word) => {
    const i = text.toLowerCase().indexOf(word.toLowerCase());
    if (i < 0) return escH(text.slice(0, 90));
    const a = Math.max(0, i - 36), b = Math.min(text.length, i + word.length + 54);
    return (a ? '…' : '') + escH(text.slice(a, i)) + '<mark>' + escH(text.slice(i, i + word.length)) + '</mark>' + escH(text.slice(i + word.length, b)) + (b < text.length ? '…' : '');
  };
  const paint = () => {
    box.innerHTML = hits.length ? hits.map((h, i) => `<a href="${h.href}" role="option"${i === cur ? ' class="is-on" aria-selected="true"' : ''}><b>${escH(h.title)}</b><small>${h.ctx}</small></a>`).join('') : '<div class="empty">찾는 내용이 없습니다. 다른 낱말로 찾아보세요.</div>';
    box.hidden = false;
  };
  q.addEventListener('input', async () => {
    const word = q.value.trim();
    if (!word) { box.hidden = true; return; }
    const pages = await load(), w = fold(word);
    const scored = [];
    for (const p of pages) {
      if (fold(p.title).includes(w)) scored.push({ s: 0, href: `${p.slug}.html`, title: p.title, ctx: escH(p.section + (p.summary ? ' · ' + p.summary : '')) });
      for (const [a, t] of p.heads) if (fold(t).includes(w)) scored.push({ s: 1, href: `${p.slug}.html#${a}`, title: `${p.title} › ${t}`, ctx: escH(p.section) });
      if (!fold(p.title).includes(w) && fold(p.text).includes(w)) scored.push({ s: 2, href: `${p.slug}.html`, title: p.title, ctx: around(p.text, word) });
    }
    hits = scored.sort((x, y) => x.s - y.s).slice(0, 12);
    cur = hits.length ? 0 : -1;
    paint();
  });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!hits.length) return;
      e.preventDefault();
      cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
      paint();
    } else if (e.key === 'Enter' && hits[cur]) location.href = hits[cur].href;
    else if (e.key === 'Escape') { q.value = ''; box.hidden = true; q.blur(); }
  });
  q.addEventListener('focus', load);
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.hidden = true; });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
  });

  // this page's headings: the one being read is marked
  const links = [...document.querySelectorAll('.toc a')];
  if (links.length && 'IntersectionObserver' in window) {
    const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) en.isIntersecting ? seen.add(en.target.id) : seen.delete(en.target.id);
      const first = [...document.querySelectorAll('article h2, article h3')].find((h) => seen.has(h.id));
      if (first) links.forEach((a) => a.classList.toggle('is-on', a === byId.get(first.id)));
    }, { rootMargin: '-60px 0px -60% 0px' });
    document.querySelectorAll('article h2, article h3').forEach((h) => io.observe(h));
  }

  // screenshots open large in the theme being shown
  const zoom = $('#zoom');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.shot-zoom');
    if (!a) return;
    e.preventDefault();
    zoom.querySelector('img').src = root.dataset.theme === 'dark' ? a.dataset.dark : a.getAttribute('href');
    zoom.querySelector('img').alt = a.querySelector('img').alt;
    zoom.hidden = false;
  });
  zoom.addEventListener('click', () => { zoom.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zoom.hidden = true; });
})();
