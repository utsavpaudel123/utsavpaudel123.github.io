/* ========================================================================
   NEURAL FRONTIER v2 — Enhanced Application Script
   Utsav Paudel Portfolio
   ======================================================================== */

(function () {
  'use strict';

  // ---- Register GSAP plugins ----
  gsap.registerPlugin(ScrollTrigger);

  // ---- Prefers Reduced Motion ----
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    gsap.globalTimeline.timeScale(100);
  }

  const html = document.documentElement;
  const isMobile = window.innerWidth < 768;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  // ================================================================
  // CUSTOM CURSOR
  // ================================================================
  if (!isTouch) {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');

    if (dot && ring) {
      let mouseX = -100, mouseY = -100;
      let dotX = -100, dotY = -100;
      let ringX = -100, ringY = -100;

      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        // Activate custom cursor (hide native) only after first mouse movement
        if (!document.body.classList.contains('cursor-active')) {
          document.body.classList.add('cursor-active');
        }
      });

      document.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-active');
      });
      document.addEventListener('mouseenter', () => {
        document.body.classList.add('cursor-active');
      });

      // Hover detection
      const hoverables = 'a, button, [role="button"], input, textarea, select, label, .skill-tags span, .hero-tags span, .project-grid-card';
      document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverables)) {
          dot.classList.add('hovering');
          ring.classList.add('hovering');
        }
      });
      document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverables)) {
          dot.classList.remove('hovering');
          ring.classList.remove('hovering');
        }
      });

      function animateCursor() {
        // Smooth follow
        dotX += (mouseX - dotX) * 0.25;
        dotY += (mouseY - dotY) * 0.25;
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;

        dot.style.left = dotX + 'px';
        dot.style.top = dotY + 'px';
        ring.style.left = ringX + 'px';
        ring.style.top = ringY + 'px';

        requestAnimationFrame(animateCursor);
      }
      animateCursor();
    }
  }

  // ================================================================
  // MAGNETIC EFFECT
  // ================================================================
  if (!isTouch) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, {
          x: x * 0.25,
          y: y * 0.25,
          duration: 0.4,
          ease: 'power2.out'
        });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  // ---- Theme Toggle ----
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
  // HERO — Advanced Particle Network Canvas
  // ================================================================
  initNeuralCanvas();

  function initNeuralCanvas() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    let time = 0;

    const PARTICLE_COUNT = isMobile ? 60 : 120;
    const CONNECTION_DIST = isMobile ? 120 : 180;
    const MOUSE_RADIUS = 200;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      initParticles();
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 1.5 + Math.random() * 2.5,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.7,
          hue: Math.random() > 0.7 ? 1 : 0 // 0 = primary (cyan), 1 = accent (purple)
        });
      }
    }

    let canvasVisible = true;
    if (!prefersReduced) {
      ScrollTrigger.create({
        trigger: '#hero',
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => { canvasVisible = true; draw(); },
        onLeave: () => { canvasVisible = false; },
        onEnterBack: () => { canvasVisible = true; draw(); },
        onLeaveBack: () => { canvasVisible = false; }
      });
    }

    function draw() {
      if (!canvasVisible && !prefersReduced) return;
      time += 0.005;
      ctx.clearRect(0, 0, width, height);

      const isDark = html.getAttribute('data-theme') !== 'light';

      // Primary (cyan) and accent (purple) colors
      const colors = isDark
        ? [{ r: 0, g: 240, b: 255 }, { r: 139, g: 92, b: 246 }]
        : [{ r: 8, g: 145, b: 178 }, { r: 124, g: 58, b: 237 }];

      // Update particle positions
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Gentle floating
        p.x += p.vx + Math.sin(time * p.speed + p.phase) * 0.3;
        p.y += p.vy + Math.cos(time * p.speed * 0.7 + p.phase) * 0.3;

        // Mouse interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS) {
          const force = (1 - dist / MOUSE_RADIUS) * 2;
          p.x -= dx * force * 0.01;
          p.y -= dy * force * 0.01;
        }

        // Wrap around edges
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            const c = colors[a.hue];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const c = colors[p.hue];
        const pulseAlpha = 0.6 + Math.sin(time * p.speed * 3 + p.phase) * 0.3;

        // Glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 6);
        glowGrad.addColorStop(0, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.15 * pulseAlpha) + ')');
        glowGrad.addColorStop(1, 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 6, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (0.7 + pulseAlpha * 0.3) + ')';
        ctx.fill();
      }

      if (!prefersReduced) {
        requestAnimationFrame(draw);
      }
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
      c.style.animationDelay = (i * 50 + 500) + 'ms';
    });
  }

  // ---- Hero tagline animation ----
  const heroTagline = document.querySelector('.hero-tagline');
  if (heroTagline) {
    gsap.fromTo(heroTagline,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, ease: 'power2.out', delay: 1.2 }
    );
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
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 60%', toggleActions: 'play none none reverse' }
        }
      );
    }
  });

  // ---- About Section Animations ----
  const aboutDesc = document.querySelector('.about-description');
  if (aboutDesc) {
    gsap.set(aboutDesc, { y: 40 });
    gsap.to(aboutDesc, {
      opacity: 1, y: 0, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: aboutDesc, start: 'top 80%', toggleActions: 'play none none reverse' }
    });
  }

  // About heading animation
  const aboutHeading = document.querySelector('.about-heading');
  if (aboutHeading) {
    gsap.fromTo(aboutHeading,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: aboutHeading, start: 'top 85%', toggleActions: 'play none none reverse' }
      }
    );
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
      val: target, duration: 1.8, delay: i * 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: stat, start: 'top 85%', toggleActions: 'play none none none' },
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
  const timelineElement = document.querySelector('.timeline');

  if (timelineElement) {
    let dotTriggers = [];

    function calculateTimelineDots() {
      const timelineHeight = timelineElement.offsetHeight || 1;
      if (timelineFill) {
        timelineFill.style.backgroundSize = `100% ${timelineHeight}px`;
      }
      dotTriggers = Array.from(timelineItems).map(item => {
        const dotCenterY = item.offsetTop + 14;
        return { element: item, threshold: dotCenterY / timelineHeight };
      });
    }

    calculateTimelineDots();
    ScrollTrigger.addEventListener('refresh', calculateTimelineDots);

    if (timelineFill) {
      ScrollTrigger.create({
        trigger: timelineElement,
        start: 'top 50%',
        end: 'bottom 50%',
        onUpdate: (self) => {
          timelineFill.style.height = self.progress * 100 + '%';

          dotTriggers.forEach(dot => {
            if (self.progress >= dot.threshold) {
              dot.element.classList.add('active');
            } else {
              dot.element.classList.remove('active');
            }
          });
        }
      });
    }

    timelineItems.forEach((item) => {
      gsap.fromTo(item,
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: item, start: 'top 80%', toggleActions: 'play none none none' }
        }
      );
    });
  }

  // ================================================================
  // PROJECTS — Grid reveal with stagger
  // ================================================================
  const projectCards = document.querySelectorAll('.project-grid-card');
  if (projectCards.length) {
    projectCards.forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 60, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.9,
          delay: i * 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );

      // Animate metric numbers on scroll
      const metricNum = card.querySelector('.project-metric-number');
      if (metricNum) {
        const target = parseFloat(metricNum.dataset.count);
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target, duration: 1.5, ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none none'
          },
          onUpdate: () => {
            metricNum.textContent = target >= 1000
              ? Math.floor(counter.val).toLocaleString() + '+'
              : Math.floor(counter.val);
          }
        });
      }
    });

    // Tilt effect on project cards (desktop only)
    if (!isTouch) {
      projectCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotateY: x * 8,
            rotateX: -y * 8,
            transformPerspective: 800,
            duration: 0.4,
            ease: 'power2.out'
          });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            rotateY: 0,
            rotateX: 0,
            duration: 0.6,
            ease: 'elastic.out(1, 0.5)'
          });
        });
      });
    }
  }

  // ---- Skills — Staggered reveal ----
  document.querySelectorAll('.skill-category').forEach((cat, i) => {
    gsap.fromTo(cat,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7, delay: i * 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: cat, start: 'top 85%', toggleActions: 'play none none reverse' }
      }
    );
  });

  // ---- Section label animations ----
  document.querySelectorAll('.section-label').forEach(label => {
    gsap.fromTo(label,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: label, start: 'top 90%', toggleActions: 'play none none reverse' }
      }
    );
  });

  document.querySelectorAll('.section-heading').forEach(heading => {
    gsap.fromTo(heading,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: heading, start: 'top 85%', toggleActions: 'play none none reverse' }
      }
    );
  });

  // ---- Contact reveal ----
  gsap.fromTo('.contact-heading',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact', start: 'top 70%', toggleActions: 'play none none reverse' }
    }
  );

  gsap.fromTo('.contact-sub',
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact', start: 'top 70%', toggleActions: 'play none none reverse' }
    }
  );

  document.querySelectorAll('.contact-link').forEach((link, i) => {
    gsap.fromTo(link,
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, delay: 0.3 + i * 0.1, ease: 'power2.out',
        scrollTrigger: { trigger: '.contact-links', start: 'top 80%', toggleActions: 'play none none reverse' }
      }
    );
  });

  // ---- Social sidebar entrance ----
  const sidebar = document.getElementById('social-sidebar');
  if (sidebar) {
    gsap.fromTo(sidebar,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 1, delay: 2, ease: 'power2.out' }
    );
  }

  // ---- Resume fixed entrance ----
  const resumeFixed = document.querySelector('.resume-fixed');
  if (resumeFixed) {
    gsap.fromTo(resumeFixed,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 1, delay: 2.2, ease: 'power2.out' }
    );
  }

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
