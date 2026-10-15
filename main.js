/* Latent Space - portfolio motion. No dependencies.
   Every loop runs only while its element is on screen. */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  const C = { ink: v('--ink'), mut: v('--mut'), line: v('--line-2'), acc: v('--acc'), acc2: v('--acc-2'), panel: v('--panel') };

  // ---------- Email (assembled at runtime to dodge scrapers) ----------
  $$('[data-email]').forEach(a => (a.href = 'mailto:' + a.dataset.email + '@' + a.dataset.domain));

  // ---------- One-shot observer ----------
  const once = (els, fn, opts) => {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); }
    }), opts);
    els.forEach(el => io.observe(el));
  };
  once($$('.reveal'), el => el.classList.add('in'), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  // ---------- Count-up stats ----------
  if (!reduced) once($$('[data-to]'), el => {
    const to = +el.dataset.to, dec = +(el.dataset.dec || 0), t0 = performance.now();
    const step = t => {
      const p = clamp((t - t0) / 1400);
      el.textContent = (to * (1 - (1 - p) ** 3)).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.5 });

  // ---------- Hero typer ----------
  const typed = $('#typed');
  if (typed && !reduced) (async () => {
    const words = ['RAG pipelines', 'voice agents', 'text-to-SQL engines', 'GraphRAG systems', 'LLM extraction pipelines'];
    for (let i = 0; ;) {
      await sleep(2400);
      while (typed.textContent) { typed.textContent = typed.textContent.slice(0, -1); await sleep(26); }
      i = (i + 1) % words.length;
      for (const ch of words[i]) { typed.textContent += ch; await sleep(55); }
    }
  })();

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
  // HERO - embedding point cloud; the cursor is a query vector
  // ============================================================
  const hero = $('#latent');
  if (hero) {
    const CL = [
      ['retrieval', -0.85, -0.3, 0.25], ['llms', 0.1, -0.8, -0.35], ['speech', 0.92, -0.12, 0.3],
      ['text→sql', -0.42, 0.55, -0.55], ['graphs', 0.55, 0.62, 0.05], ['vision', -0.15, 0.18, 0.95],
    ];
    const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
    const noise = () => (Math.random() - 0.5) * 3.2;
    const P = Array.from({ length: innerWidth < 760 ? 420 : 900 }, (_, i) => {
      const k = i % CL.length, s = 0.13 + (i % 4) * 0.035;
      return {
        k, tx: CL[k][1] + gauss() * s, ty: CL[k][2] + gauss() * s, tz: CL[k][3] + gauss() * s,
        sx: noise(), sy: noise(), sz: noise(), ph: Math.random() * 6.283, X: 0, Y: 0, Z: 1,
      };
    });
    const O = { X: 0, Y: 0, Z: 1 }, ptr = { x: 0, y: 0, at: -1e9 }, q = { x: NaN, y: NaN };
    const hud = $('#hud-q');
    let t0 = 0, tiltX = 0, tiltY = 0, hudAt = 0;

    addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.at = performance.now();
    }, { passive: true });

    animate(hero, (ctx, w, h, t) => {
      t0 ||= t;
      const narrow = w < 760;
      const R = narrow ? Math.min(w * 0.36, 160) : Math.min(w * 0.24, h * 0.34);
      const textRight = Math.max(0, (w - 1200) / 2) + 608; // keep the cloud clear of the hero copy
      const cx = narrow ? w * 0.5 : Math.max(w * 0.66, Math.min(w - R * 0.55, textRight + R * 0.95));
      const cy = narrow ? Math.min(h * 0.24, 230) : h * 0.47;
      const e = reduced ? 1 : 1 - (1 - clamp((t - t0) / 2600)) ** 3; // noise -> clusters ("denoising")
      const live = t - ptr.at < 2500 && Math.hypot(ptr.x - cx, ptr.y - cy) < R * 1.7;
      tiltY += ((live ? (ptr.x / w - 0.5) * 0.8 : 0) - tiltY) * 0.04;
      tiltX += ((live ? (ptr.y / h - 0.5) * 0.4 : 0) - tiltX) * 0.04;
      const ay = (reduced ? 0.5 : t * 0.00011) + tiltY, ax = -0.28 + tiltX;
      const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
      const proj = (x, y, z, o) => {
        const x1 = x * ca + z * sa, z1 = z * ca - x * sa, y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb, s = 3 / (3 + z2);
        o.X = cx + x1 * R * s; o.Y = cy + y1 * R * s; o.Z = s;
      };

      const amp = reduced ? 0 : 0.02 + (1 - e) * 0.12;
      for (const p of P) {
        proj(p.sx + (p.tx - p.sx) * e + Math.sin(t * 0.0007 + p.ph) * amp,
          p.sy + (p.ty - p.sy) * e + Math.cos(t * 0.0009 + p.ph) * amp,
          p.sz + (p.tz - p.sz) * e, p);
      }

      // query: pointer near the cloud, otherwise a slow wander
      const gx = live ? ptr.x : cx + R * 0.95 * Math.sin(t * 0.00031);
      const gy = live ? ptr.y : cy + R * 0.7 * Math.sin(t * 0.00047 + 1);
      if (Number.isNaN(q.x)) { q.x = gx; q.y = gy; }
      q.x += (gx - q.x) * 0.08; q.y += (gy - q.y) * 0.08;

      // ponytail: O(n*k) top-k scan, fine for <1k points
      const K = 6, best = [];
      for (const p of P) {
        const d = (p.X - q.x) ** 2 + (p.Y - q.y) ** 2;
        if (best.length < K || d < best[K - 1].d) {
          best.push({ p, d }); best.sort((a, b) => a.d - b.d);
          if (best.length > K) best.pop();
        }
      }
      const k = best[0].p.k;

      ctx.clearRect(0, 0, w, h);
      for (const p of P) {
        const s = 0.8 + p.Z * 1.1;
        ctx.globalAlpha = clamp((p.Z - 0.62) * 1.5, 0.08, 0.9) * (0.35 + 0.65 * e);
        ctx.fillStyle = p.k === k && e > 0.9 ? C.acc : C.ink;
        ctx.fillRect(p.X - s / 2, p.Y - s / 2, s, s);
      }

      const show = clamp((e - 0.85) * 6.6);
      if (show > 0) {
        ctx.strokeStyle = ctx.fillStyle = C.acc; ctx.lineWidth = 1;
        for (const { p } of best) {
          ctx.globalAlpha = 0.5 * show;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.X, p.Y); ctx.stroke();
          ctx.globalAlpha = show; ctx.fillRect(p.X - 2, p.Y - 2, 4, 4);
        }
        ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, 6.283); ctx.stroke();
        ctx.font = '11px "Geist Mono", ui-monospace, monospace';
        ctx.fillText('q', q.x + 9, q.y - 8);
        CL.forEach((c, i) => {
          proj(c[1], c[2], c[3], O);
          ctx.globalAlpha = (i === k ? 1 : 0.5) * show;
          ctx.fillStyle = i === k ? C.acc : C.mut;
          ctx.fillText(c[0], O.X + R * 0.16, O.Y - R * 0.16);
        });
      }
      ctx.globalAlpha = 1;

      if (hud && show && t - hudAt > 250) {
        hudAt = t;
        const sim = clamp(1 - Math.sqrt(best.reduce((a, b) => a + b.d, 0) / K) / (R * 1.4), 0.5, 0.99);
        hud.textContent = `q → ${CL[k][0]} · top-${K} · cos ${sim.toFixed(2)}`;
      }
    });
  }

  // ============================================================
  // 01 RAG - retrieve, re-rank, generate, then cite-map:
  // the LLM cites [n]; post-processing maps n -> chunk metadata -> URL
  // ============================================================
  const RAG = [
    {
      q: 'What does an H-1B visa require?',
      c: [['uscis_h1b_overview · §2', 0.79, 0.93, 'uscis.gov/…/h-1b-specialty-occupations'], ['dol_lca_guide · §1', 0.84, 0.88, 'dol.gov/…/lca'],
        ['h1b_cap_season · §3', 0.72, 0.81, 'uscis.gov/…/h-1b-cap-season'], ['l1_visa_overview · §2', 0.81, 0.34], ['o1_visa_faq · §4', 0.75, 0.21]],
      a: 'An H-1B needs a job offer in a specialty occupation [1] and a certified Labor Condition Application from the employer [2]. Most new petitions also go through the annual cap lottery [3].',
    },
    {
      q: 'How long can a Japan SSW (i) worker stay?',
      c: [['ssw_overview_jp · §3', 0.82, 0.95, 'isa.go.jp/…/ssw'], ['ssw_family_rules · §1', 0.7, 0.86, 'isa.go.jp/…/ssw-family'],
        ['ssw_exam_guide · §2', 0.74, 0.8, 'ssw.go.jp/…/exams'], ['ssw_ii_overview · §1', 0.85, 0.37], ['jp_student_visa · §4', 0.69, 0.18]],
      a: 'Specified Skilled Worker (i) status allows up to five years in total [1]. Family members usually cannot join under this status [2]. Workers must pass a skills test and a Japanese language test [3].',
    },
  ];
  const ranks = (c, j) => {
    const pos = [];
    c.map((_, i) => i).sort((a, b) => c[b][j] - c[a][j]).forEach((idx, r) => (pos[idx] = r));
    return pos;
  };

  $$('[data-scene="rag"]').forEach(el => scene(el, async wait => {
    const q = $('[data-q]', el), list = $('[data-chunks]', el), ans = $('[data-a]', el), refs = $('[data-refs]', el);
    const st = $('[data-status]', el), stages = $$('[data-stages] li', el);
    const stage = n => stages.forEach((s, i) => (s.className = i < n ? 'done' : i === n ? 'cur' : ''));
    for (let r = 0; ; r = (r + 1) % RAG.length) {
      const d = RAG[r], byR = ranks(d.c, 1), byX = ranks(d.c, 2);
      stage(-1); q.textContent = ''; ans.textContent = ''; refs.innerHTML = ''; st.textContent = 'waiting for query';
      list.innerHTML = d.c.map(([src], i) =>
        `<li style="--i:${byR[i]}"><span class="cid"></span><span class="src">${src}</span><span class="bar"><i></i></span><span class="sc">0.00</span></li>`).join('');
      const rows = [...list.children];
      await type(q, d.q, wait, 30);

      stage(0); st.textContent = 'retrieve · bedrock kb · hybrid';
      for (const i of byR.map((_, i) => i).sort((a, b) => byR[a] - byR[b])) {
        rows[i].classList.add('in'); rows[i].style.setProperty('--w', d.c[i][1]);
        rows[i].lastChild.textContent = d.c[i][1].toFixed(2);
        await wait(140);
      }
      await wait(500);

      stage(1); st.textContent = 're-rank · keep top 3';
      await wait(400);
      rows.forEach((row, i) => {
        row.style.setProperty('--i', byX[i]); row.style.setProperty('--w', d.c[i][2]);
        row.lastChild.textContent = d.c[i][2].toFixed(2); row.classList.toggle('drop', byX[i] > 2);
      });
      await wait(1100);
      st.textContent = 'context · ids [1] [2] [3]';
      for (let n = 0; n < 3; n++) {
        const row = rows[byX.indexOf(n)];
        row.classList.add('cited'); row.firstChild.textContent = n + 1;
        await wait(220);
      }
      await wait(300);

      stage(2); st.textContent = 'generate · claude haiku 4.5';
      for (const tok of d.a.split(' ')) {
        const m = tok.match(/^\[(\d)\](.*)$/);
        if (!m) { ans.append((ans.textContent ? ' ' : '') + tok); await wait(55); continue; }
        const raw = document.createElement('span');
        raw.className = 'raw'; raw.textContent = `[${m[1]}]`;
        ans.append(raw, m[2]);
        await wait(120);
      }
      await wait(500);

      stage(3); st.textContent = 'cite-map · [n] → chunk metadata → url';
      for (const raw of $$('.raw', ans)) {
        const n = +raw.textContent.slice(1, -1), i = byX.indexOf(n - 1), row = rows[i];
        row.classList.add('hit'); raw.classList.add('hit');
        await wait(380);
        const sup = document.createElement('sup');
        sup.textContent = n; raw.replaceWith(sup);
        const li = document.createElement('li');
        li.innerHTML = `<b>${n}</b><span></span>`; li.lastChild.textContent = d.c[i][3];
        refs.append(li);
        row.classList.remove('hit');
        await wait(320);
      }
      stage(4); st.textContent = 'done · 3 sources linked';
      await wait(4500);
    }
  }));

  // ============================================================
  // 02 SQL - schema search, token-streamed SQL, execution, plain-language answer
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
      st.textContent = 'guardrails · read-only ✓';
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
  // 03 VOICE - live waveform + transcript + agent tool calls + doctor's calendar
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
    if (s.who) s.col = s.who === 'agent' ? C.acc : C.acc2;
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
              step.innerHTML = '<p class="cc-call"><i>⏺</i></p><p class="cc-out">⎿ running…</p>';
              step.firstChild.append(call); tools.append(step);
              await wait(650);
              step.className = 'cc-step ok'; step.lastChild.textContent = '⎿ ' + out; fx(c);
              await wait(380); continue;
            }
            const li = document.createElement('li');
            li.className = who; li.innerHTML = `<b class="mono">${who}</b><span></span>`;
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
  // 04 GRAPHRAG - multi-hop traversal over a knowledge graph
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
    const pad = 22, pos = {}, drift = reduced ? 0 : 4, done = g.hop >= 4;
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
      ctx.globalAlpha = done && !win ? 0.35 : 1; ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (!lit(kind)) continue;
      const p = prog(kind), mx = x1 + (x2 - x1) * p, my = y1 + (y2 - y1) * p;
      ctx.globalAlpha = done && !win ? 0.15 : 0.9; ctx.strokeStyle = win ? C.acc : C.acc2; ctx.lineWidth = win ? 2 : 1.2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.stroke();
      if (p < 1) { ctx.fillStyle = C.acc2; ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, 6.283); ctx.fill(); }
    }

    ctx.font = '10px "Geist Mono", ui-monospace, monospace'; ctx.textAlign = 'center';
    for (const id in GN) {
      const [x, y] = pos[id], type = id[0], r = { a: 4, g: 6.5, l: 5, p: 8.5 }[type];
      const on = (type === 'g' && g.hop >= 1) || (type === 'l' && g.hop >= 2 && prog('co') === 1) || (type === 'p' && g.hop >= 3 && prog('in') === 1);
      const win = done && WIN.has(id), fade = done && !win, col = win ? C.acc : on ? C.acc2 : C.mut;
      ctx.globalAlpha = fade ? 0.35 : 1; ctx.fillStyle = C.panel; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.stroke();
      if (on || win) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r - 2.5, 0, 6.283); ctx.fill(); }
      if ((type === 'g' && g.hop === 1) || (id === 'g1' && done)) {
        const k = (((t - g.at) % 1400) + 1400) % 1400 / 1400;
        ctx.globalAlpha = (1 - k) * 0.8; ctx.strokeStyle = done ? C.acc : C.acc2;
        ctx.beginPath(); ctx.arc(x, y, r + k * 14, 0, 6.283); ctx.stroke();
      }
      ctx.globalAlpha = fade ? 0.35 : on || win ? 1 : 0.75;
      ctx.fillStyle = win ? C.acc : C.mut;
      ctx.fillText(GN[id][2], x, y + r + 13);
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
  // SIDE 1 - cc-explain-this: step runs, then the pane explains it
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
          step.innerHTML = '<p class="cc-call"><i>⏺</i></p><p class="cc-out"></p>';
          step.firstChild.append(call);
          term.append(step);
          st.textContent = 'claude · ' + tool;
          await wait(750);
          step.className = 'cc-step ' + res;
          step.lastChild.innerHTML = out;

          // right: the side pane explains it after the step is done
          const li = document.createElement('li');
          li.className = 'run';
          li.innerHTML = `<p class="mono"><i>◌</i><b>${tool}</b></p><span></span>`;
          if (label) {
            const em = document.createElement('em');
            em.className = label === 'risky' ? 'lbl-risk' : 'lbl-fail'; em.textContent = label;
            li.firstChild.append(em);
          }
          list.append(li);
          st.textContent = 'explain this · haiku';
          await wait(450);
          li.className = res;
          li.querySelector('i').textContent = res === 'ok' ? '✓' : '✗';
          await type(li.lastChild, text, wait, 14);
          await wait(300);
        }
        st.textContent = '5 steps · 1 failed · 1 risky';
        await wait(5000);
      }
    });
  });

  // ============================================================
  // SIDE 2 - jev-router: classify, pick model lane, set effort
  // ============================================================
  const ROUTE = [
    { q: 'What does this regex do?', s: ['type: explain', 'depth: low', 'all signals simple'], m: 0, e: 0, r: 'every signal says simple → Haiku' },
    { q: 'Add pagination to the users endpoint.', s: ['type: implement', 'depth: medium', 'breadth: 3 files'], m: 1, e: 2, r: 'request type sets the start · breadth adds effort' },
    { q: 'Rotate the prod DB password and migrate the schema.', s: ['type: implement', 'security ✓', 'irreversible ✓'], m: 2, e: 3, r: 'security or irreversible work → at least Opus' },
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

  // ============================================================
  // MINI-ME - interactive figurine
  // ============================================================
  const mini = $('#mini');
  if (mini) {
    const fig = $('.mini-fig', mini), say = $('[data-say]', mini), live = $('[data-live]', mini);
    const shadesBtn = $('[data-act="shades"]', mini);
    const ANS = {
      build: "Mostly LLM systems that real people use. Right now that's chatbots that show their sources and voice agents that answer phone calls.",
      rag: 'Search your documents first, make the model answer only from what it found, and show where each line came from.',
      stack: 'Python and FastAPI on AWS Bedrock. I open PyTorch when I need to go lower.',
      where: 'Koteshwor, in Kathmandu. Come visit, the momos are good.',
      hire: 'Maybe! I take on consulting work and collaborations. The email link is just below.',
      joke: 'I told my LLM a joke about retrieval. It said it needed more context.',
    };
    const HI = ['Namaste!', 'Hi there!', 'Hello from Kathmandu!'];
    let talk = 0, waves = 0;

    const speak = async text => {
      const my = ++talk;
      live.textContent = text; // screen readers get the full line once
      if (reduced) { say.textContent = text; return; }
      mini.classList.add('talking'); say.textContent = '';
      for (const ch of text) {
        if (my !== talk) return;
        say.textContent += ch;
        await sleep(16);
      }
      mini.classList.remove('talking');
    };

    const toggleShades = () => {
      const on = mini.classList.toggle('shades');
      shadesBtn.setAttribute('aria-pressed', on);
      shadesBtn.textContent = on ? 'Take off the shades' : 'Put on the shades';
      speak(on ? 'Shades on. I look like someone who deploys on Fridays.' : 'Shades off. Back to reading logs.');
    };

    fig.addEventListener('click', e => {
      if (e.target.closest('.f-cap')) return toggleShades();
      waves++;
      mini.classList.remove('waving'); void mini.offsetWidth; mini.classList.add('waving');
      speak(waves > 4 ? "Okay, okay, I'm awake. Ask me something." : HI[(waves - 1) % HI.length]);
    });
    $('.f-arm-r', fig).addEventListener('animationend', () => mini.classList.remove('waving'));
    shadesBtn.addEventListener('click', toggleShades);
    $$('[data-ask]', mini).forEach(b => b.addEventListener('click', () => speak(ANS[b.dataset.ask])));

    // head and eyes follow the pointer
    let raf = 0, px = 0, py = 0;
    const look = () => {
      raf = 0;
      const r = fig.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      mini.style.setProperty('--lx', clamp((px - (r.left + r.width / 2)) / 420, -1, 1).toFixed(3));
      mini.style.setProperty('--ly', clamp((py - (r.top + r.height * 0.36)) / 420, -1, 1).toFixed(3));
    };
    const onPointer = e => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(look); };
    addEventListener('pointermove', onPointer, { passive: true });
    addEventListener('pointerdown', onPointer, { passive: true });

    once([mini], () => speak("Hey! I'm the small version of Utsav. Ask me something, or poke my cap."), { threshold: 0.4 });
  }
})();
