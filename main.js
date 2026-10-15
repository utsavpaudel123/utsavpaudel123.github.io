/* Portfolio of Utsav Paudel. No dependencies.
   Two live parts: a BM25 retriever over this page (hero) and the citation mapper.
   Every replay loop runs only while its panel is on screen. */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  const C = { ink: v('--ink'), mut: v('--muted'), line: v('--line'), acc: v('--accent'), bg: v('--bg') };
  const MONO = '12px ui-monospace, "SF Mono", Menlo, Consolas, monospace'; // taste-skill-ignore: canvas labels inside [data-ui] panels

  // ---------- Email (assembled at runtime to dodge scrapers) ----------
  $$('[data-email]').forEach(a => (a.href = 'mailto:' + a.dataset.email + '@' + a.dataset.domain));

  // ---------- Entrances: each part of a section rises once, staggered by arrival ----------
  $$('[data-rows]').forEach(el => $$('li', el).forEach((li, i) => li.style.setProperty('--i', i)));
  $$('.gallery .frame').forEach((f, i) => f.style.setProperty('--i', i));
  const io = new IntersectionObserver(es => {
    let k = 0;
    es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.style.setProperty('--i', k++);
      e.target.classList.add('is-in');
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  [...$$('[data-reveal] > *'), ...$$('.gallery')].forEach(el => io.observe(el));

  // ---------- Canvas loop: draws while visible; one static frame when reduced ----------
  function animate(canvas, draw) {
    let ctx, w, h, raf = 0, inView = false;
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!raf) draw(ctx, w, h, performance.now());
    };
    const tick = t => { draw(ctx, w, h, t); raf = requestAnimationFrame(tick); };
    const sync = () => {
      const run = inView && !document.hidden && !reduced;
      if (run && !raf) raf = requestAnimationFrame(tick);
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    fit();
    new ResizeObserver(fit).observe(canvas);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(canvas);
    document.addEventListener('visibilitychange', sync);
  }

  // ---------- Scene: async timeline that restarts on enter, stops on leave ----------
  const STOP = Symbol('stop');
  function scene(el, play) {
    if (reduced) return; // static HTML already shows the final state
    let gen = 0;
    new IntersectionObserver(([e]) => {
      const my = ++gen;
      if (!e.isIntersecting) return;
      $$('[data-lock]', el).forEach(x => (x.style.minHeight ||= x.offsetHeight + 'px'));
      el.classList.add('live');
      const wait = ms => new Promise((ok, no) => setTimeout(() => (my === gen ? ok() : no(STOP)), ms));
      play(wait).catch(err => { if (err !== STOP) throw err; });
    }, { threshold: 0.3 }).observe(el);
  }
  const type = async (el, text, wait, ms = 28) => {
    el.textContent = '';
    for (const ch of text) { el.textContent += ch; await wait(ms); }
  };

  // ============================================================
  // HERO - ask this page. BM25 over the page's own paragraphs; the
  // answer cites [n], then a cite-map step turns each [n] into a link
  // to the paragraph it came from (the visa chatbot's trick).
  // ============================================================
  const rt = $('#ask');
  if (rt) {
    const STOPW = new Set(('a an and are as at be been by can do does for from had has have he her him his how i if in into is it its ' +
      'me my of on or our so than that the their them then there these they this to was we were what when where which who whom why will with you your').split(' '));
    const stem = w => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);
    const toks = s => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => !STOPW.has(w)).map(stem);
    const skip = '[data-ui], figure, .ledger, .grp, .sign, .sign-role, .hint, .state-w, .sr-only';

    const docs = $$('main section[data-src] :is(p, li)')
      .filter(el => !el.closest(skip) && el.textContent.trim().length > 30)
      .map((el, i) => {
        const art = el.closest('article');
        const label = art ? $('h3', art).textContent.replace('↗', '').trim() : el.closest('[data-src]').dataset.src;
        el.id ||= 'p-' + i;
        const text = el.innerText.replace(/\s*\n+\s*/g, ' · ').trim();
        const t = toks(label + ' ' + text), tf = new Map();
        t.forEach(w => tf.set(w, (tf.get(w) || 0) + 1));
        return { el, label, text, len: t.length, tf };
      });
    const N = docs.length, avg = docs.reduce((a, d) => a + d.len, 0) / N, df = new Map();
    docs.forEach(d => d.tf.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)));
    const idf = w => Math.log(1 + (N - df.get(w) + 0.5) / (df.get(w) + 0.5));
    const bm25 = (d, q) => q.reduce((s, w) => {
      const f = d.tf.get(w);
      return f ? s + idf(w) * f * 2.2 / (f + 1.2 * (0.5 + 0.5 * d.len / avg)) : s;
    }, 0);
    // the sentence in a paragraph that shares the most terms with the question
    const pick = (d, qt) => {
      const ss = d.text.split(/(?<=[a-z0-9)%][.!?])\s+(?=[A-Z])/).filter(s => !s.trim().endsWith('?'));
      let top = (ss[0] || '').trim(), hi = 0;
      for (const s of ss) {
        const n = new Set(toks(s).filter(w => qt.includes(w))).size;
        if (n > hi) { hi = n; top = s.trim(); }
      }
      return top.length > 170 ? top.slice(0, 168).replace(/\s+\S*$/, '') + '…' : top;
    };

    const form = $('[data-form]', rt), input = $('#q', rt), hitsEl = $('[data-hits]', rt);
    const ans = $('[data-ans]', rt), read = $('[data-read]', rt);
    read.textContent = `${N} chunks indexed`;
    let gen = 0, touched = false;

    const run = async (q, typed, instant) => {
      const my = ++gen, alive = () => my === gen;
      const nap = ms => (reduced || instant ? Promise.resolve() : sleep(ms));
      if (typed && !reduced) {
        input.value = '';
        for (const ch of q) { if (!alive() || touched) return; input.value += ch; await sleep(55); }
      }
      const t0 = performance.now(), qt = [...new Set(toks(q))];
      const hits = docs.map(d => ({ d, s: bm25(d, qt) })).filter(h => h.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
      const ms = performance.now() - t0;
      read.textContent = `${N} chunks · ${ms < 0.1 ? '<0.1' : ms.toFixed(1)} ms`;

      if (!hits.length) {
        hitsEl.innerHTML = '';
        ans.textContent = 'Nothing on this page matches those words. Try one of the questions above.';
        return;
      }
      const max = hits[0].s;
      hitsEl.innerHTML = '';
      hits.forEach(({ d, s }, i) => {
        const li = document.createElement('li');
        li.className = 'pre';
        li.innerHTML = `<a href="#${d.el.id}"><b>${i + 1}</b><span></span><i></i><em>${s.toFixed(2)}</em></a>`;
        $('span', li).textContent = d.label;
        hitsEl.append(li);
      });
      ans.textContent = '';
      for (const [i, li] of [...hitsEl.children].entries()) {
        await nap(110); if (!alive()) return;
        li.classList.remove('pre');
        $('i', li).style.setProperty('--w', (hits[i].s / max).toFixed(2));
      }

      // generate: quoted sentences, each followed by its raw [n]
      const lines = [], seen = new Set();
      hits.forEach(({ d }, i) => {
        const s = pick(d, qt);
        if (s && !seen.has(s) && lines.length < 2) { seen.add(s); lines.push([s, i + 1, d]); }
      });
      await nap(250);
      for (const [s, n] of lines) {
        for (const word of s.split(' ')) {
          if (!alive()) return;
          ans.append((ans.textContent ? ' ' : '') + word);
          await nap(28);
        }
        const raw = document.createElement('code');
        raw.className = 'raw'; raw.textContent = `[${n}]`;
        ans.append(' ', raw);
      }

      // cite-map: [n] -> the paragraph it came from
      await nap(450);
      for (const raw of $$('.raw', ans)) {
        if (!alive()) return;
        raw.classList.add('hit');
        await nap(260);
        const n = +raw.textContent.slice(1, -1), d = hits[n - 1].d, sup = document.createElement('sup');
        sup.innerHTML = `<a href="#${d.el.id}" title="${d.label}">${n}</a>`;
        if (raw.previousSibling?.nodeType === 3) raw.previousSibling.textContent = raw.previousSibling.textContent.replace(/\s+$/, '');
        raw.replaceWith(sup);
      }
    };

    form.addEventListener('submit', e => { e.preventDefault(); touched = true; if (input.value.trim()) run(input.value.trim()); });
    $$('[data-try] button', rt).forEach(b => b.addEventListener('click', () => { touched = true; input.value = b.textContent; run(b.textContent); }));
    input.addEventListener('focus', () => (touched = true));

    // a cited link scrolls to its paragraph and marks it for a moment
    rt.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      const el = a && document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      el.classList.add('is-in');
      el.closest('[data-reveal] > *')?.classList.add('is-in');
      el.classList.add('is-cited');
      setTimeout(() => el.classList.remove('is-cited'), 2600);
    });

    // each visit opens on one of the suggested questions, answered at once
    const tries = $$('[data-try] button', rt).map(b => b.textContent);
    input.value = tries[Math.floor(Math.random() * tries.length)];
    run(input.value, false, true);
  }

  // ============================================================
  // CITATIONS - the middle copy is live: point at an ID, then map them
  // ============================================================
  const cm = $('[data-cite]');
  if (cm) {
    const META = {
      1: ['uscis_h1b_overview §2', '0.93', 'uscis.gov/…/h-1b-specialty-occupations'],
      2: ['dol_lca_guide §1', '0.88', 'dol.gov/…/lca'],
      3: ['h1b_cap_season §3', '0.81', 'uscis.gov/…/h-1b-cap-season'],
    };
    const ans = $('[data-cite-a]', cm), pop = $('[data-cite-pop]', cm), refs = $('[data-cite-refs]', cm);
    const btn = $('[data-cite-map]', cm), hint = $('[data-cite-hint]', cm), start = ans.innerHTML;
    const HINT = hint.textContent;
    let busy = false, mapped = false;

    const show = e => {
      const b = e.target.closest('.cid');
      if (!b || mapped) return;
      $$('.cid', ans).forEach(x => x.classList.toggle('on', x === b));
      const [chunk, score, url] = META[b.dataset.n];
      pop.textContent = `[${b.dataset.n}] chunk ${chunk} · score ${score} · source_url ${url}`;
    };
    ['pointerover', 'focusin', 'click'].forEach(t => ans.addEventListener(t, show));

    btn.addEventListener('click', async () => {
      if (busy) return;
      if (mapped) {
        ans.innerHTML = start; refs.innerHTML = ''; pop.hidden = false;
        btn.textContent = 'Map citations'; hint.textContent = HINT; mapped = false;
        return;
      }
      busy = true; pop.hidden = true; hint.textContent = 'Mapping each ID to its source URL…';
      for (const b of $$('.cid', ans)) {
        b.classList.add('hit');
        await sleep(reduced ? 0 : 320);
        const n = b.dataset.n, sup = document.createElement('sup');
        sup.textContent = n;
        if (b.previousSibling?.nodeType === 3) b.previousSibling.textContent = b.previousSibling.textContent.replace(/\s+$/, '');
        b.replaceWith(sup);
        const li = document.createElement('li');
        li.innerHTML = `<b>${n}</b>`; li.append(META[n][2]);
        refs.append(li);
        await sleep(reduced ? 0 : 180);
      }
      hint.textContent = 'Every link came from chunk metadata, not from the model.';
      btn.textContent = 'Reset'; mapped = true; busy = false;
    });
  }

  // ============================================================
  // SQL - schema search, token-streamed SQL, execution, plain-language answer
  // ============================================================
  const SQL = [
    {
      q: 'Which applicants missed their third installment?', t: ['applicants', 'loans', 'installments'],
      sql: 'SELECT a.id, l.amount, i.due_at\nFROM applicants a\nJOIN loans l ON l.applicant_id = a.id\nJOIN installments i ON i.loan_id = l.id\nWHERE i.seq = 3 AND i.paid_at IS NULL\nORDER BY i.due_at DESC\nLIMIT 50;',
      n: 4, ms: 38,
      a: 'Four applicants missed their third installment. The latest is APL-2291, with 420,000 due on 14 Aug 2025. The other three are APL-1873, APL-3310 and APL-0954.',
    },
    {
      q: 'What is the average loan size by region this quarter?', t: ['loans', 'branches'],
      sql: "SELECT b.region, ROUND(AVG(l.amount)) AS avg_amount\nFROM loans l\nJOIN branches b ON b.id = l.branch_id\nWHERE l.created_at >= date_trunc('quarter', now())\nGROUP BY b.region\nORDER BY avg_amount DESC;",
      n: 4, ms: 52,
      a: 'Central has the largest average loan this quarter at 512,400. West is next at 388,900, then East at 301,250 and North at 287,600.',
    },
  ];
  const KW = /^(SELECT|FROM|JOIN|ON|WHERE|AND|IS|NULL|ORDER|BY|DESC|LIMIT|GROUP|AS)$/, FN = /^(ROUND|AVG|date_trunc|now)$/;

  $$('[data-scene="sql"]').forEach(el => scene(el, async wait => {
    const q = $('[data-q]', el), code = $('[data-sql]', el), ans = $('[data-a]', el);
    const st = $('[data-status]', el), tables = $$('[data-schema] li', el);
    for (let r = 0; ; r = (r + 1) % SQL.length) {
      const d = SQL[r];
      q.textContent = ''; code.textContent = ''; ans.textContent = '';
      tables.forEach(li => li.classList.remove('on'));
      st.textContent = 'waiting for question';
      await type(q, d.q, wait, 30);

      st.textContent = 'schema search · bm25 + pgvector';
      for (const li of tables) if (d.t.includes(li.textContent)) { li.classList.add('on'); await wait(220); }
      await wait(300);

      st.textContent = 'generate · nova pro';
      for (const tok of d.sql.match(/\s+|'[^']*'|\w+|[^\s\w]/g)) {
        const cls = KW.test(tok) ? 'k' : FN.test(tok) ? 'f' : /^('|\d)/.test(tok) ? 's' : '';
        if (cls) { const s = document.createElement('span'); s.className = cls; s.textContent = tok; code.append(s); } else code.append(tok);
        if (tok.trim()) await wait(34);
      }
      st.textContent = 'guardrails · read-only ok';
      await wait(700);

      st.textContent = `executed · ${d.n} rows · ${d.ms} ms`;
      await wait(600);

      st.textContent = 'answer · nova pro';
      for (const word of d.a.split(' ')) { ans.append((ans.textContent ? ' ' : '') + word); await wait(55); }
      st.textContent = `answered · ${d.n} rows · ${d.ms} ms`;
      await wait(4500);
    }
  }));

  // ============================================================
  // VOICE - live waveform + transcript + agent tool calls + doctor's calendar
  // ============================================================
  const CALL = [
    ['agent', 'Thanks for calling. How can I help today?'],
    ['caller', 'Hi, I need to move my follow-up. My daughter is sick.'],
    [0], [1],
    ['agent', 'Sorry to hear that. Dr. Mehta has Thursday at 10 or Friday at 2. Which works?'],
    ['caller', 'Friday at 2, please.'],
    [2], [3],
    ['agent', "Booked. I'll text the confirmation to the number on file."],
    [4],
  ];
  // [call, result, calendar change]; c = { old, free: [thu, fri], neu }
  const TOOLS = [
    ['verify_patient(caller_id)', 'P-4471 · insurance active', c => c.old.classList.add('hit')],
    ['find_slots(dr_mehta, 3d)', 'Thu 10:00 · Fri 14:00', c => c.free.forEach(f => f.classList.add('on'))],
    ['book(openemr, Fri 14:00)', 'appt A-2093 confirmed', c => c.free[1].classList.add('held')],
    ['calendar.add(dr_mehta)', 'added Fri 14:00 · freed Wed 11:00', c => {
      c.neu.classList.add('on'); c.old.classList.add('gone'); c.free[0].classList.remove('on');
    }],
    ['send_sms(•••0193)', 'confirmation delivered', () => {}],
  ];

  function drawWave(ctx, w, h, t, s) {
    if (s.who) s.col = s.who === 'agent' ? C.acc : C.ink;
    const target = s.who ? 0.35 + 0.65 * Math.abs(Math.sin(t * 0.009) * Math.sin(t * 0.0037 + 1)) : reduced ? 0.5 : 0.05;
    s.amp += (target - s.amp) * (reduced ? 1 : 0.12);
    ctx.clearRect(0, 0, w, h);
    for (let L = 2; L >= 0; L--) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const u = x / w, env = Math.sin(Math.PI * u) ** 2;
        const y = h / 2 + Math.sin(u * (9 + L * 5) - t * 0.004 * (1 + L * 0.4) + L * 2) * env * s.amp * h * 0.42 * (1 - L * 0.28);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = s.col; ctx.globalAlpha = [0.95, 0.45, 0.22][L]; ctx.lineWidth = L ? 1 : 1.6;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  $$('[data-scene="voice"]').forEach(el => {
    const s = { who: null, amp: 0, col: C.acc };
    animate($('[data-wave]', el), (ctx, w, h, t) => drawWave(ctx, w, h, t, s));
    scene(el, async wait => {
      const lines = $('[data-lines]', el), tools = $('[data-tools]', el), st = $('[data-status]', el);
      const c = { old: $('[data-ev="old"]', el), free: $$('[data-ev="free"]', el), neu: $('[data-ev="new"]', el) };
      for (;;) {
        lines.innerHTML = ''; tools.innerHTML = ''; s.who = null;
        c.old.classList.remove('hit', 'gone'); c.free.forEach(f => f.classList.remove('on', 'held')); c.neu.classList.remove('on');
        st.textContent = 'ringing…';
        await wait(1100);
        let sec = 0;
        const clock = () => '00:' + String(sec).padStart(2, '0');
        st.textContent = 'live ' + clock();
        const timer = setInterval(() => { sec++; st.textContent = 'live ' + clock(); }, 1000);
        try {
          for (const [who, text] of CALL) {
            if (typeof who === 'number') {
              const [call, out, fx] = TOOLS[who], step = document.createElement('div');
              step.className = 'cc-step run';
              step.innerHTML = '<samp class="cc-call"><i>⏺</i></samp><samp class="cc-out">⎿ running…</samp>';
              step.firstChild.append(call); tools.append(step);
              await wait(650);
              step.className = 'cc-step ok'; step.lastChild.textContent = '⎿ ' + out; fx(c);
              await wait(380); continue;
            }
            const li = document.createElement('li');
            li.className = who; li.innerHTML = `<b>${who}</b><span></span>`;
            lines.append(li);
            const span = li.lastChild;
            s.who = who;
            for (const word of text.split(' ')) {
              span.textContent += (span.textContent ? ' ' : '') + word;
              await wait(150 + Math.random() * 110);
            }
            s.who = null;
            await wait(650);
          }
        } finally { clearInterval(timer); s.who = null; }
        st.textContent = `ended · ${clock()} · booked`;
        await wait(4500);
      }
    });
  });

  // ============================================================
  // GRAPHRAG - multi-hop traversal over a knowledge graph
  // ============================================================
  const GN = {
    a1: [0.06, 0.16, 'A-102'], a2: [0.05, 0.47, 'A-077'], a3: [0.09, 0.78, 'A-219'], a4: [0.22, 0.95, 'A-310'],
    g1: [0.33, 0.22, 'G-17'], g2: [0.3, 0.56, 'G-04'], g3: [0.4, 0.84, 'G-31'],
    l1: [0.6, 0.08, 'L-204'], l2: [0.55, 0.32, 'L-311'], l3: [0.64, 0.53, 'L-118'], l5: [0.56, 0.74, 'L-152'], l4: [0.66, 0.94, 'L-402'],
    p1: [0.9, 0.18, 'P-retail'], p2: [0.92, 0.52, 'P-sme'], p3: [0.89, 0.86, 'P-agri'],
  };
  const pairs = s => s.split(' ').map(e => [e.slice(0, 2), e.slice(2)]);
  const GE = { own: pairs('a1l1 a2l2 a3l3 a3l5 a4l4'), co: pairs('g1l1 g1l3 g1l5 g2l2 g2l3 g3l4'), in: pairs('l1p1 l2p1 l3p2 l5p3 l4p3') };
  const WIN = new Set(['g1', 'l1', 'l3', 'l5', 'p1', 'p2', 'p3']);

  function drawGraph(ctx, w, h, t, g) {
    const pad = 24, pos = {}, drift = reduced ? 0 : 4, done = g.hop >= 4;
    Object.keys(GN).forEach((id, i) => {
      const [x, y] = GN[id];
      pos[id] = [pad + x * (w - 2 * pad) + Math.sin(t * 0.0007 + i) * drift, pad + y * (h - 2 * pad - 12) + Math.cos(t * 0.0006 + i * 1.3) * drift];
    });
    const prog = kind => ((kind === 'co' && g.hop === 2) || (kind === 'in' && g.hop === 3) ? clamp((t - g.at) / 800) : 1);
    const lit = kind => (kind === 'co' && g.hop >= 2) || (kind === 'in' && g.hop >= 3);

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (const kind in GE) for (const [a, b] of GE[kind]) {
      const [x1, y1] = pos[a], [x2, y2] = pos[b], win = done && kind !== 'own' && WIN.has(a) && WIN.has(b);
      ctx.globalAlpha = done && !win ? 0.45 : 1; ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (!lit(kind)) continue;
      const p = prog(kind), mx = x1 + (x2 - x1) * p, my = y1 + (y2 - y1) * p;
      ctx.globalAlpha = done && !win ? 0.2 : 0.9; ctx.strokeStyle = win ? C.acc : C.ink; ctx.lineWidth = win ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.stroke();
      if (p < 1) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, 6.283); ctx.fill(); }
    }

    ctx.font = MONO; ctx.textAlign = 'center';
    for (const id in GN) {
      const [x, y] = pos[id], type = id[0], r = { a: 4, g: 6.5, l: 5, p: 8.5 }[type];
      const on = (type === 'g' && g.hop >= 1) || (type === 'l' && g.hop >= 2 && prog('co') === 1) || (type === 'p' && g.hop >= 3 && prog('in') === 1);
      const win = done && WIN.has(id), fade = done && !win, col = win ? C.acc : on ? C.ink : C.mut;
      ctx.globalAlpha = fade ? 0.4 : 1; ctx.fillStyle = C.bg; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.stroke();
      if (on || win) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r - 2.5, 0, 6.283); ctx.fill(); }
      if ((type === 'g' && g.hop === 1) || (id === 'g1' && done)) {
        const k = (((t - g.at) % 1400) + 1400) % 1400 / 1400;
        ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = done ? C.acc : C.ink;
        ctx.beginPath(); ctx.arc(x, y, r + k * 14, 0, 6.283); ctx.stroke();
      }
      ctx.globalAlpha = fade ? 0.4 : on || win ? 1 : 0.8;
      ctx.fillStyle = win ? C.acc : on ? C.ink : C.mut;
      ctx.fillText(GN[id][2], x, y + r + 14);
    }
    ctx.globalAlpha = 1;
  }

  $$('[data-scene="graph"]').forEach(el => {
    const g = { hop: 4, at: 0 };
    animate($('[data-graph]', el), (ctx, w, h, t) => drawGraph(ctx, w, h, t, g));
    const q = $('[data-q]', el), cy = $('[data-cypher]', el), st = $('[data-status]', el), ans = $('[data-a]', el);
    const Q = q.textContent, CY = cy.textContent, A = ans.textContent;
    scene(el, async wait => {
      const hop = (n, s) => { g.hop = n; g.at = performance.now(); st.textContent = s; };
      for (;;) {
        hop(0, 'waiting for query'); q.textContent = ''; cy.textContent = ''; ans.textContent = '';
        await type(q, Q, wait, 30);
        st.textContent = 'text → cypher';
        await type(cy, CY, wait, 9);
        hop(1, 'hop 1 · (:Guarantor)'); await wait(1500);
        hop(2, 'hop 2 · CO_SIGNS → (:Loan)'); await wait(1500);
        hop(3, 'hop 3 · IN → (:Portfolio)'); await wait(1500);
        hop(4, 'aggregate · count(DISTINCT p) ≥ 3'); await wait(900);
        st.textContent = 'answer · gpt';
        for (const word of A.split(' ')) { ans.append((ans.textContent ? ' ' : '') + word); await wait(55); }
        st.textContent = 'done · 1 match · 6 edges';
        await wait(5000);
      }
    });
  });

  // ============================================================
  // cc-explain-this: step runs, then the pane explains it
  // ============================================================
  const STEPS = [
    ['Bash', 'Bash(grep -rl "SESSION_TTL" src)', '⎿ src/auth/session.ts', 'Searches the code for every file that sets the session timeout.', 'ok'],
    ['Edit', 'Update(src/auth/session.ts)', '<span class="del">- TTL = 15 * 60</span><span class="add">+ TTL = 30 * 60</span>', 'Changes the session timeout from 15 to 30 minutes.', 'ok'],
    ['Bash', 'Bash(npm test)', '⎿ 2 failed, 41 passed', 'Two tests fail because the test clock still expects 15 minutes.', 'bad', 'failed'],
    ['Edit', 'Update(test/session.test.ts)', '⎿ updated 2 lines', 'Updates the two tests to expect the new 30-minute timeout.', 'ok'],
    ['Bash', 'Bash(git push origin main)', '⎿ main → main', 'Sends your commits to the shared main branch, where others will see them.', 'ok', 'risky'],
  ];

  $$('[data-scene="explain"]').forEach(el => {
    const term = $('[data-term]', el), list = $('[data-steps]', el), st = $('[data-status]', el);
    const prompt = $('.cc-prompt', el), Q = prompt.textContent;
    scene(el, async wait => {
      for (;;) {
        $$('.cc-step', term).forEach(s => s.remove()); list.innerHTML = '';
        st.textContent = 'waiting for prompt';
        await type(prompt, Q, wait, 30);
        for (const [tool, call, out, text, res, label] of STEPS) {
          // left: Claude Code runs the tool
          const step = document.createElement('div');
          step.className = 'cc-step run';
          step.innerHTML = '<samp class="cc-call"><i>⏺</i></samp><samp class="cc-out"></samp>';
          step.firstChild.append(call);
          term.append(step);
          st.textContent = 'claude · ' + tool;
          await wait(750);
          step.className = 'cc-step ' + res;
          step.lastChild.innerHTML = out;

          // right: the side pane explains it after the step is done
          const li = document.createElement('li');
          li.className = 'run';
          li.innerHTML = `<p><i>○</i><b>${tool}</b></p><span></span>`;
          if (label) { const em = document.createElement('em'); em.textContent = label; li.firstChild.append(em); }
          list.append(li);
          st.textContent = 'explain this · haiku';
          await wait(450);
          li.className = res;
          li.querySelector('i').textContent = '●';
          await type(li.lastChild, text, wait, 14);
          await wait(300);
        }
        st.textContent = '5 steps · 1 failed · 1 risky';
        await wait(5000);
      }
    });
  });

  // ============================================================
  // jev-router: classify, pick model lane, set effort
  // ============================================================
  const ROUTE = [
    { q: 'What does this regex do?', s: ['type: explain', 'depth: low', 'all signals simple'], m: 0, e: 0, r: 'every signal says simple → Haiku' },
    { q: 'Add pagination to the users endpoint.', s: ['type: implement', 'depth: medium', 'breadth: 3 files'], m: 1, e: 2, r: 'request type sets the start · breadth adds effort' },
    { q: 'Rotate the prod DB password and migrate the schema.', s: ['type: implement', 'security: yes', 'irreversible: yes'], m: 2, e: 3, r: 'security or irreversible work → at least Opus' },
    { q: 'yes, do it', s: ['short reply · skip jev'], skip: true, m: 2, e: 3, r: 'stays on the current model · prompt cache kept' },
  ];
  const EFF = ['—', 'low', 'medium', 'high', 'xhigh', 'max'];

  $$('[data-scene="router"]').forEach(el => scene(el, async wait => {
    const q = $('[data-q]', el), sig = $('[data-signals]', el), rule = $('[data-rule]', el), st = $('[data-status]', el);
    const lanes = $$('[data-lanes] li', el), names = lanes.map(li => li.firstChild.textContent);
    const set = (m, e) => lanes.forEach((li, i) => {
      li.classList.toggle('pick', i === m);
      $$('.eff i', li).forEach((s, j) => s.classList.toggle('on', i === m && j < e));
      li.lastChild.textContent = i === m ? EFF[e] : '';
    });
    for (let r = 0; ; r = (r + 1) % ROUTE.length) {
      const d = ROUTE[r];
      if (r === 0) set(-1, 0);
      sig.innerHTML = ''; rule.textContent = ''; q.textContent = ''; st.textContent = 'waiting for message';
      await type(q, d.q, wait, 28);
      st.textContent = d.skip ? 'skip jev' : 'asking jev…';
      for (const s of d.s) {
        const li = document.createElement('li');
        li.textContent = s; sig.append(li);
        await wait(260);
      }
      if (!d.skip) {
        for (const li of lanes) { li.classList.add('scan'); await wait(140); li.classList.remove('scan'); }
        set(d.m, 0);
        for (let e = 1; e <= d.e; e++) { await wait(160); set(d.m, e); }
      }
      await type(rule, d.r, wait, 12);
      st.textContent = `→ ${names[d.m]}${d.e ? ' · ' + EFF[d.e] : ''}${d.skip ? '' : ' · jev 0.4 s'}`;
      await wait(2800);
    }
  }));
})();
