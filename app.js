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

  // ---- Neural Network Canvas ----
  initNeuralCanvas();

  function initNeuralCanvas() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height, nodes = [], mouse = { x: -1000, y: -1000 };
    const NODE_COUNT = window.innerWidth < 768 ? 40 : 80;
    const CONNECTION_DIST = 150;

    function resize() {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    function createNodes() {
      nodes = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 1
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const isDark = html.getAttribute('data-theme') !== 'light';
      const nodeColor = isDark ? 'rgba(0, 212, 255, 0.6)' : 'rgba(8, 145, 178, 0.5)';
      const lineColor = isDark ? 'rgba(0, 212, 255, ' : 'rgba(8, 145, 178, ';

      // Update + draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Mouse repel
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          n.x += dx * 0.01;
          n.y += dy * 0.01;
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // Connections
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const ddx = n.x - m.x;
          const ddy = n.y - m.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < CONNECTION_DIST) {
            const alpha = (1 - d / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = lineColor + alpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }

    resize();
    createNodes();
    draw();

    window.addEventListener('resize', () => { resize(); createNodes(); });
    document.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
  }

  // ---- Splitting.js — character reveal ----
  if (typeof Splitting !== 'undefined') {
    Splitting();
    document.querySelectorAll('.hero-name .char').forEach((c, i) => {
      c.style.animationDelay = (i * 40 + 400) + 'ms';
    });
  }

  // ---- Photo Parallax ----
  document.querySelectorAll('.photo-break').forEach(section => {
    const img = section.querySelector('img');
    const caption = section.querySelector('.caption');

    gsap.to(img, {
      yPercent: -10,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    if (caption) {
      gsap.fromTo(caption,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 60%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }
  });

  // ---- About Section Animations ----
  const aboutDesc = document.querySelector('.about-description');
  if (aboutDesc) {
    gsap.to(aboutDesc, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: aboutDesc,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
    gsap.set(aboutDesc, { y: 30 });
  }

  // Stats counter animation
  document.querySelectorAll('.stat').forEach((stat, i) => {
    const numEl = stat.querySelector('.stat-number');
    const target = parseFloat(numEl.dataset.count);
    const isDecimal = target % 1 !== 0;

    gsap.to(stat, {
      opacity: 1,
      duration: 0.6,
      delay: i * 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: stat,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });

    const counter = { val: 0 };
    gsap.to(counter, {
      val: target,
      duration: 1.5,
      delay: i * 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: stat,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      },
      onUpdate: () => {
        if (isDecimal) {
          numEl.textContent = counter.val.toFixed(1) + '+';
        } else if (target >= 1000) {
          numEl.textContent = Math.floor(counter.val).toLocaleString() + '+';
        } else {
          numEl.textContent = Math.floor(counter.val);
        }
      }
    });
  });

  // ---- Experience Timeline ----
  const timelineItems = document.querySelectorAll('.timeline-item');
  const timelineFill = document.querySelector('.timeline-line-fill');

  if (timelineFill) {
    gsap.to(timelineFill, {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.timeline',
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: true
      }
    });
  }

  timelineItems.forEach((item, i) => {
    gsap.fromTo(item,
      { opacity: 0, x: -30 },
      {
        opacity: 1,
        x: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: item,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      }
    );

    // Active state
    ScrollTrigger.create({
      trigger: item,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: () => item.classList.add('active'),
      onLeave: () => item.classList.remove('active'),
      onEnterBack: () => item.classList.add('active'),
      onLeaveBack: () => item.classList.remove('active')
    });
  });

  // ---- Projects — Apple-style pinned showcase ----
  const slides = document.querySelectorAll('.project-slide');
  const dots = document.querySelectorAll('.project-dot');
  const showcasePin = document.getElementById('project-showcase-pin');
  const showcase = document.getElementById('project-showcase');

  if (slides.length > 1 && showcase && showcasePin) {
    const totalSlides = slides.length;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: showcase,
        start: 'top top',
        end: () => '+=' + (totalSlides * 100) + '%',
        pin: showcasePin,
        scrub: 1,
        snap: {
          snapTo: 1 / (totalSlides - 1),
          duration: { min: 0.2, max: 0.6 },
          delay: 0.1,
          ease: 'power1.inOut'
        }
      }
    });

    // Build timeline — fade between slides
    slides.forEach((slide, i) => {
      if (i === 0) {
        // First slide is already visible
        if (i < totalSlides - 1) {
          tl.to(slide, { opacity: 0, duration: 0.5 }, i);
          tl.fromTo(slides[i + 1], { opacity: 0 }, { opacity: 1, duration: 0.5 }, i);
        }
      } else if (i < totalSlides - 1) {
        tl.to(slide, { opacity: 0, duration: 0.5 }, i);
        tl.fromTo(slides[i + 1], { opacity: 0 }, { opacity: 1, duration: 0.5 }, i);
      }
    });

    // Update dots
    ScrollTrigger.create({
      trigger: showcase,
      start: 'top top',
      end: () => '+=' + (totalSlides * 100) + '%',
      scrub: true,
      onUpdate: (self) => {
        const idx = Math.round(self.progress * (totalSlides - 1));
        dots.forEach((d, di) => {
          d.classList.toggle('active', di === idx);
        });
      }
    });

    // Animate project metric numbers when they become visible
    slides.forEach(slide => {
      const metricNum = slide.querySelector('.project-metric-number');
      if (metricNum) {
        const target = parseFloat(metricNum.dataset.count);
        let animated = false;

        ScrollTrigger.create({
          trigger: showcase,
          start: 'top top',
          end: () => '+=' + (totalSlides * 100) + '%',
          onUpdate: () => {
            if (parseFloat(getComputedStyle(slide).opacity) > 0.5 && !animated) {
              animated = true;
              const counter = { val: 0 };
              gsap.to(counter, {
                val: target,
                duration: 1,
                ease: 'power2.out',
                onUpdate: () => {
                  metricNum.textContent = target >= 1000
                    ? Math.floor(counter.val).toLocaleString() + '+'
                    : Math.floor(counter.val);
                }
              });
            }
            if (parseFloat(getComputedStyle(slide).opacity) < 0.3) {
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
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        delay: i * 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: cat,
          start: 'top 85%',
          toggleActions: 'play none none reverse'
        }
      }
    );
  });

  // ---- Contact reveal ----
  gsap.fromTo('.contact-heading',
    { opacity: 0, y: 30 },
    {
      opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
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
