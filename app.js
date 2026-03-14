/* ========================================================================
   NEURAL FRONTIER — Main Application Script
   Utsav Paudel Portfolio
   ======================================================================== */

(function () {
  'use strict';

  // ---- Register GSAP plugins ----
  gsap.registerPlugin(ScrollTrigger);

  // ---- Theme Toggle ----
  const html = document.documentElement;
  let currentTheme = 'dark';

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', currentTheme);
      document.querySelectorAll('[data-theme-toggle]').forEach(b => {
        const label = currentTheme === 'dark' ? 'light' : 'dark';
        b.setAttribute('aria-label', 'Switch to ' + label + ' mode');
        b.innerHTML = currentTheme === 'dark'
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      });
    });
  });

  // ---- Mobile Menu ----
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  window.closeMobileMenu = function () {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  };

  // ---- Nav scroll behavior ----
  const nav = document.getElementById('nav');
  ScrollTrigger.create({
    start: 'top -80',
    onUpdate: (self) => {
      if (self.progress > 0) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
  });

  // ---- Scroll progress bar ----
  const progressBar = document.getElementById('scroll-progress');
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      progressBar.style.width = (self.progress * 100) + '%';
    }
  });

  // ================================================================
  // HERO — Structured Neural Network Canvas
  // ================================================================
  initNeuralCanvas();

  function initNeuralCanvas() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let networkNodes = [];
    let networkEdges = [];
    let mouse = { x: -9999, y: -9999 };
    let time = 0;

    const isMobile = window.innerWidth < 768;
    const LAYERS = isMobile ? [3, 5, 6, 5, 3] : [4, 7, 10, 10, 7, 4];
    const NODE_RADIUS = isMobile ? 5 : 7;
    const GLOW_RADIUS = isMobile ? 18 : 28;
    const CONNECTION_WIDTH_MIN = 0.6;
    const CONNECTION_WIDTH_MAX = 2.2;
    const PULSE_SPEED = 0.006;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      buildNetwork();
    }

    function buildNetwork() {
      networkNodes = [];
      networkEdges = [];

      const numLayers = LAYERS.length;
      const layerSpacing = width / (numLayers + 1);
      const verticalPadding = height * 0.15;
      const usableHeight = height - verticalPadding * 2;

      for (let l = 0; l < numLayers; l++) {
        const nodesInLayer = LAYERS[l];
        const x = layerSpacing * (l + 1);
        const nodeSpacing = usableHeight / (nodesInLayer + 1);

        for (let n = 0; n < nodesInLayer; n++) {
          const y = verticalPadding + nodeSpacing * (n + 1);
          networkNodes.push({
            x: x, y: y, baseX: x, baseY: y,
            layer: l, index: n, radius: NODE_RADIUS,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.5 + Math.random() * 1.5,
            activation: 0.3 + Math.random() * 0.7
          });
        }
      }

      for (let i = 0; i < networkNodes.length; i++) {
        for (let j = 0; j < networkNodes.length; j++) {
          if (networkNodes[j].layer === networkNodes[i].layer + 1) {
            const weight = 0.1 + Math.random() * 0.9;
            if (weight > 0.25) {
              networkEdges.push({
                from: i, to: j, weight: weight,
                flowPhase: Math.random() * Math.PI * 2,
                flowSpeed: 0.3 + Math.random() * 0.7
              });
            }
          }
        }
      }
    }

    function draw() {
      time += PULSE_SPEED;
      ctx.clearRect(0, 0, width, height);

      const isDark = html.getAttribute('data-theme') !== 'light';
      const primaryR = isDark ? 0 : 8;
      const primaryG = isDark ? 212 : 145;
      const primaryB = isDark ? 255 : 178;
      const accentR = isDark ? 245 : 217;
      const accentG = isDark ? 158 : 119;
      const accentB = isDark ? 11 : 6;

      for (let i = 0; i < networkNodes.length; i++) {
        const node = networkNodes[i];
        const dx = mouse.x - node.baseX;
        const dy = mouse.y - node.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = Math.max(0, 1 - dist / 250);
        node.x = node.baseX + Math.sin(time * node.pulseSpeed + node.phase) * 3 - dx * influence * 0.05;
        node.y = node.baseY + Math.cos(time * node.pulseSpeed * 0.7 + node.phase) * 3 - dy * influence * 0.05;
      }

      // Draw edges
      for (let e = 0; e < networkEdges.length; e++) {
        const edge = networkEdges[e];
        const from = networkNodes[edge.from];
        const to = networkNodes[edge.to];
        const lineWidth = CONNECTION_WIDTH_MIN + edge.weight * (CONNECTION_WIDTH_MAX - CONNECTION_WIDTH_MIN);
        const baseAlpha = 0.06 + edge.weight * 0.18;
        const flowT = ((time * edge.flowSpeed * 0.5 + edge.flowPhase) % 1);
        const flowX = from.x + (to.x - from.x) * flowT;
        const flowY = from.y + (to.y - from.y) * flowT;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = 'rgba(' + primaryR + ',' + primaryG + ',' + primaryB + ',' + baseAlpha + ')';
        ctx.lineWidth = lineWidth;
        ctx.stroke();

        if (edge.weight > 0.5) {
          const flowGrad = ctx.createRadialGradient(flowX, flowY, 0, flowX, flowY, 20);
          flowGrad.addColorStop(0, 'rgba(' + primaryR + ',' + primaryG + ',' + primaryB + ',' + (0.3 * edge.weight) + ')');
          flowGrad.addColorStop(1, 'rgba(' + primaryR + ',' + primaryG + ',' + primaryB + ',0)');
          ctx.beginPath();
          ctx.arc(flowX, flowY, 20, 0, Math.PI * 2);
          ctx.fillStyle = flowGrad;
          ctx.fill();
        }
      }

      // Draw nodes
      for (let i = 0; i < networkNodes.length; i++) {
        const node = networkNodes[i];
        const pulseAlpha = 0.5 + Math.sin(time * node.pulseSpeed + node.phase) * 0.3;
        const isInput = node.layer === 0;
        const isOutput = node.layer === LAYERS.length - 1;
        let nr, ng, nb;
        if (isInput || isOutput) { nr = accentR; ng = accentG; nb = accentB; }
        else { nr = primaryR; ng = primaryG; nb = primaryB; }

        const glowGrad = ctx.createRadialGradient(node.x, node.y, node.radius, node.x, node.y, GLOW_RADIUS);
        glowGrad.addColorStop(0, 'rgba(' + nr + ',' + ng + ',' + nb + ',' + (0.25 * pulseAlpha * node.activation) + ')');
        glowGrad.addColorStop(1, 'rgba(' + nr + ',' + ng + ',' + nb + ',0)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, GLOW_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + nr + ',' + ng + ',' + nb + ',' + (0.7 + pulseAlpha * 0.3) + ')';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + pulseAlpha * 0.4) + ')';
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    document.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
  }

  // ---- Splitting.js — character reveal ----
  if (typeof Splitting !== 'undefined') {
    Splitting();
    document.querySelectorAll('.hero-name .char').forEach((c, i) => {
      c.style.animationDelay = (i * 40 + 400) + 'ms';
    });
  }

  // ---- Hero transformer BG — soft fade-in on load ----
  const heroTfBg = document.querySelector('.hero-transformer-bg');
  if (heroTfBg) {
    gsap.fromTo(heroTfBg,
      { opacity: 0, x: 40 },
      { opacity: 0.12, x: 0, duration: 2.5, delay: 1.2, ease: 'power2.out' }
    );
    // Gentle floating animation
    gsap.to(heroTfBg, {
      y: -12, duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 3.7
    });
  }

  // ---- Photo Parallax ----
  document.querySelectorAll('.photo-break').forEach(section => {
    const img = section.querySelector('img');
    const caption = section.querySelector('.caption');

    gsap.to(img, {
      yPercent: -10,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true }
    });

    if (caption) {
      gsap.fromTo(caption,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 60%', toggleActions: 'play none none reverse' }
        }
      );
    }
  });

  // ---- About Section Animations ----
  const aboutDesc = document.querySelector('.about-description');
  if (aboutDesc) {
    gsap.set(aboutDesc, { y: 30 });
    gsap.to(aboutDesc, {
      opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: aboutDesc, start: 'top 80%', toggleActions: 'play none none reverse' }
    });
  }

  // Stats counter animation
  document.querySelectorAll('.stat').forEach((stat, i) => {
    const numEl = stat.querySelector('.stat-number');
    const target = parseFloat(numEl.dataset.count);
    const isDecimal = target % 1 !== 0;

    gsap.to(stat, {
      opacity: 1, duration: 0.6, delay: i * 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: stat, start: 'top 85%', toggleActions: 'play none none reverse' }
    });

    const counter = { val: 0 };
    gsap.to(counter, {
      val: target, duration: 1.5, delay: i * 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: stat, start: 'top 85%', toggleActions: 'play none none reverse' },
      onUpdate: () => {
        if (isDecimal) numEl.textContent = counter.val.toFixed(1) + '+';
        else if (target >= 1000) numEl.textContent = Math.floor(counter.val).toLocaleString() + '+';
        else numEl.textContent = Math.floor(counter.val);
      }
    });
  });

  // ---- Experience Timeline ----
  const timelineItems = document.querySelectorAll('.timeline-item');
  const timelineFill = document.querySelector('.timeline-line-fill');

  if (timelineFill) {
    gsap.to(timelineFill, {
      height: '100%', ease: 'none',
      scrollTrigger: { trigger: '.timeline', start: 'top 80%', end: 'bottom 20%', scrub: true }
    });
  }

  timelineItems.forEach((item) => {
    gsap.fromTo(item,
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: item, start: 'top 80%', toggleActions: 'play none none reverse' }
      }
    );
    ScrollTrigger.create({
      trigger: item, start: 'top 50%', end: 'bottom 50%',
      onEnter: () => item.classList.add('active'),
      onLeave: () => item.classList.remove('active'),
      onEnterBack: () => item.classList.add('active'),
      onLeaveBack: () => item.classList.remove('active')
    });
  });

  // ================================================================
  // PROJECTS — Apple-style pinned showcase (FIXED)
  // Each project gets its own scroll segment with hold time
  // ================================================================
  const slides = document.querySelectorAll('.project-slide');
  const dots = document.querySelectorAll('.project-dot');
  const showcasePin = document.getElementById('project-showcase-pin');
  const showcase = document.getElementById('project-showcase');

  if (slides.length > 1 && showcase && showcasePin) {
    const totalSlides = slides.length;
    // Each slide gets 1 unit of hold + transitions between them
    // Total timeline length = totalSlides (one segment per slide)
    // Transitions happen in the gaps between segments

    // Explicitly set initial opacities
    gsap.set(slides[0], { opacity: 1 });
    for (let i = 1; i < totalSlides; i++) {
      gsap.set(slides[i], { opacity: 0 });
    }

    const scrollLength = (totalSlides + 1) * 100; // extra 100vh for first slide hold

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: showcase,
        start: 'top top',
        end: '+=' + scrollLength + '%',
        pin: showcasePin,
        scrub: 0.5,
        snap: {
          snapTo: function(value) {
            // Snap points: one per slide, evenly spaced
            var step = 1 / totalSlides;
            return Math.round(value / step) * step;
          },
          duration: { min: 0.15, max: 0.4 },
          delay: 0.05,
          ease: 'power1.inOut'
        }
      }
    });

    // Timeline structure:
    // 0.0 → 1.0: Slide 0 visible (hold), then fade out at end
    // 1.0 → 2.0: Slide 1 visible (hold), then fade out at end
    // 2.0 → 3.0: Slide 2 visible (hold), then fade out at end
    // 3.0 → 4.0: Slide 3 visible (hold)
    // 
    // Transitions happen in the last 0.3 of each segment

    // First, ensure slide 0 stays at opacity 1 from 0 to 0.7
    tl.set(slides[0], { opacity: 1 }, 0);

    for (let i = 0; i < totalSlides - 1; i++) {
      var segStart = i + 0.7;
      // Fade out current slide
      tl.fromTo(slides[i], { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'power1.inOut' }, segStart);
      // Fade in next slide
      tl.fromTo(slides[i + 1], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.inOut' }, segStart);
    }

    // Update dots based on scroll progress
    ScrollTrigger.create({
      trigger: showcase,
      start: 'top top',
      end: '+=' + scrollLength + '%',
      scrub: true,
      onUpdate: (self) => {
        const segmentProgress = self.progress * totalSlides;
        const idx = Math.min(Math.floor(segmentProgress), totalSlides - 1);
        dots.forEach((d, di) => d.classList.toggle('active', di === idx));
      }
    });

    // Animate project metric numbers
    slides.forEach(slide => {
      const metricNum = slide.querySelector('.project-metric-number');
      if (metricNum) {
        const target = parseFloat(metricNum.dataset.count);
        let animated = false;

        ScrollTrigger.create({
          trigger: showcase,
          start: 'top top',
          end: '+=' + scrollLength + '%',
          onUpdate: () => {
            const op = parseFloat(getComputedStyle(slide).opacity);
            if (op > 0.5 && !animated) {
              animated = true;
              const counter = { val: 0 };
              gsap.to(counter, {
                val: target, duration: 1, ease: 'power2.out',
                onUpdate: () => {
                  metricNum.textContent = target >= 1000
                    ? Math.floor(counter.val).toLocaleString() + '+'
                    : Math.floor(counter.val);
                }
              });
            }
            if (op < 0.3) {
              animated = false;
              metricNum.textContent = '0';
            }
          }
        });
      }
    });
  }

  // ---- Skills — Staggered reveal ----
  document.querySelectorAll('.skill-category').forEach((cat, i) => {
    gsap.fromTo(cat,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, delay: i * 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: cat, start: 'top 85%', toggleActions: 'play none none reverse' }
      }
    );
  });

  // ---- Contact reveal ----
  gsap.fromTo('.contact-heading',
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact', start: 'top 70%', toggleActions: 'play none none reverse' }
    }
  );

  // ---- Smooth scroll for nav links ----
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();
