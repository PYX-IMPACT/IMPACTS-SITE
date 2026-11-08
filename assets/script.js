(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  document.documentElement.classList.add('js');

  function pages() {
    requestAnimationFrame(() => document.body.classList.add('ready'));
    addEventListener('pageshow', (e) => {
      if (e.persisted) document.body.classList.remove('leaving');
      document.body.classList.add('ready');
    });
    if (reduce) return;

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target || a.hasAttribute('download')) return;

      const url = new URL(a.href, location.href);
      if (url.protocol !== location.protocol || url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;

      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(() => { location.href = url.href; }, 220);
    });
  }

  function header() {
    const h = $('header');
    if (!h) return;
    const update = () => h.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', update, { passive: true });
    update();
  }

  function hero() {
    const title = $('.glitch');
    if (title) {
      const run = () => {
        title.classList.remove('run');
        void title.offsetWidth; // restart the animation
        title.classList.add('run');
      };
      setTimeout(run, 500);
      title.addEventListener('pointerenter', run);
    }

    const el = $('.typed');
    if (!el) return;
    const text = el.dataset.text || '';
    if (reduce) { el.textContent = text; return; }

    el.textContent = '';
    (async () => {
      await sleep(1100);
      for (const ch of text) {
        el.textContent += ch;
        await sleep(36 + Math.random() * 40);
      }
    })();
  }

  function lock() {
    if (!fine) return;

    const box = document.createElement('div');
    box.className = 'lock';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<i></i><i></i><i></i><i></i><span hidden></span>';
    document.body.append(box);
    const label = $('span', box);

    const PAD = 6;
    let current = null;

    const place = (el, pad) => {
      const r = el.getBoundingClientRect();
      box.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
      box.style.width = `${r.width + pad * 2}px`;
      box.style.height = `${r.height + pad * 2}px`;
    };

    const show = (el) => {
      if (current === el) return;
      const first = !box.classList.contains('on');
      current = el;
      label.textContent = el.dataset.lock || '';
      label.hidden = !el.dataset.lock;

      if (first) {
        box.classList.add('snap');
        place(el, PAD + 16);
        void box.offsetWidth;
        box.classList.remove('snap');
        box.classList.add('on');
      }
      place(el, PAD);
    };

    const hide = () => {
      current = null;
      box.classList.remove('on');
    };

    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest('[data-lock]');
      el ? show(el) : hide();
    });
    document.documentElement.addEventListener('pointerleave', hide);

    document.addEventListener('focusin', (e) => {
      if (e.target.matches('[data-lock]:focus-visible')) show(e.target);
    });
    document.addEventListener('focusout', hide);

    let ticking = false;
    const follow = () => {
      if (!current || ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; if (current) place(current, PAD); });
    };
    addEventListener('scroll', follow, { passive: true });
    addEventListener('resize', follow);
  }

  function terminals() {
    const roots = $$('.term');
    if (!roots.length) return;

    const pad2 = (n) => String(n).padStart(2, '0');
    const hhmm = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
    const RULE = '─'.repeat(42);

    const span = (cls, text) => {
      const s = document.createElement('span');
      if (cls) s.className = cls;
      s.textContent = text;
      return s;
    };
    const line = (body, cls, ...parts) => {
      const d = document.createElement('div');
      d.className = 'tl' + (cls ? ' ' + cls : '');
      parts.forEach((p) => d.append(p));
      body.append(d);
      return d;
    };

    const run = async (root, cfg) => {
      const body = $('.term-body', root);
      body.textContent = '';
      const wait = (ms) => (reduce ? Promise.resolve() : sleep(ms));

      line(body, '', span('r', '▌▌ '), span('y', `NETWATCH // NODE  ${cfg.node}`));
      line(body, '', span('d', RULE));
      await wait(250);

      for (const [label, status] of cfg.checks) {
        const head = `>> ${label}`;
        const st = span('d', '[ .. ]');
        line(body, '', span('c', '>> '), span('', label),
          span('d', ' ' + '.'.repeat(Math.max(3, 25 - head.length)) + ' '), st);
        await wait(320);
        st.textContent = status;
        st.className = 'c';
      }
      const head = '>> UPTIME';
      line(body, '', span('c', '>> '), span('', 'UPTIME'),
        span('d', ' ' + '.'.repeat(25 - head.length) + ' '), span('y', cfg.uptime));
      line(body, '', span('d', RULE));
      line(body, '', span('r', '✚ '), span('y', `WELCOME BACK, ${cfg.user.toUpperCase()}`));
      line(body, '');
      await wait(350);

      const promptBlock = () => {
        line(body, '', span('c', '┌─[ '), span('y', `${cfg.user}@${cfg.host}`),
          span('c', ' ]─[ '), span('', cfg.cwd), span('c', ' ]'));
        const row = line(body, 'prompt');
        const left = document.createElement('span');
        left.append(span('r', '└─▶ '));
        const cmd = span('', '');
        left.append(cmd);
        row.append(left, span('clock', hhmm()));
        return { left, cmd };
      };

      for (const step of cfg.steps) {
        const p = promptBlock();
        if (reduce) {
          p.cmd.textContent = step.cmd;
        } else {
          await sleep(500);
          for (const ch of step.cmd) {
            p.cmd.textContent += ch;
            await sleep(20 + Math.random() * 28);
          }
          await sleep(350);
        }
        for (const out of step.out || []) {
          line(body, 'out', span('', out));
          await wait(260);
        }
      }

      const idle = promptBlock();
      const caret = document.createElement('span');
      caret.className = 'caret';
      idle.left.append(caret);

      setInterval(() => {
        $$('.clock', body).forEach((c) => { c.textContent = hhmm(); });
      }, 20000);
    };

    roots.forEach((root) => {
      let cfg;
      try { cfg = JSON.parse(root.dataset.term); } catch { return; }

      if (reduce || !('IntersectionObserver' in window)) { run(root, cfg); return; }
      const io = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { io.disconnect(); run(root, cfg); }
      }, { threshold: 0.35 });
      io.observe(root);
    });
  }

  function clock() {
    const el = $('#clock');
    if (!el) return;
    const tick = () => {
      const d = new Date();
      el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => String(n).padStart(2, '0')).join(':');
    };
    tick();
    setInterval(tick, 1000);
  }

  function copy() {
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const original = btn.textContent;
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          btn.textContent = 'Copied';
        } catch {
          btn.textContent = 'Copy failed';
        }
        setTimeout(() => { btn.textContent = original; }, 1600);
      });
    });
  }

  pages();
  header();
  hero();
  lock();
  terminals();
  clock();
  copy();
})();