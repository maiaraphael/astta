gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ─── Utility: split text into char spans ─────────────────── */
function splitChars(el) {
  const html = el.innerHTML;
  // Preserve <br> and <em> tags, split only text nodes
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function wrapChars(node) {
    if (node.nodeType === 3) { // text node
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach(ch => {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode('\u00a0'));
        } else {
          const span = document.createElement('span');
          span.className = 'char';
          span.textContent = ch;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === 1 && node.tagName !== 'BR') {
      [...node.childNodes].forEach(wrapChars);
    }
  }
  [...temp.childNodes].forEach(wrapChars);
  el.innerHTML = temp.innerHTML;
  return el.querySelectorAll('.char');
}

/* ─── Utility: text scramble ──────────────────────────────── */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
function scrambleText(el, finalText, duration = 1200) {
  let frame = 0;
  const totalFrames = Math.floor(duration / 40);
  const interval = setInterval(() => {
    el.textContent = finalText
      .split('')
      .map((ch, i) => {
        if (ch === ' ') return ' ';
        if (frame / totalFrames > i / finalText.length) return ch;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      })
      .join('');
    if (++frame >= totalFrames) {
      el.textContent = finalText;
      clearInterval(interval);
    }
  }, 40);
}

/* ─── Loader — canvas liquid fill ────────────────────────── */
(function initLoader() {
  const loader     = document.getElementById('loader');
  const loaderCount = document.getElementById('loaderCount');
  const canvas     = document.getElementById('loaderCanvas');
  const ctx        = canvas.getContext('2d');
  const dpr        = window.devicePixelRatio || 1;

  // Offscreen canvas used for the text-mask compositing trick
  const off    = document.createElement('canvas');
  const offCtx = off.getContext('2d');

  let W, H, fontSize, textY;
  let fillProgress = 0; // 0 = empty → 1 = full
  let time         = 0;
  let animId;

  // Bubble pool
  const bubbles = [];

  // ── Setup ──────────────────────────────────────────────────
  function setup() {
    const wrap = canvas.parentElement;
    W = wrap.offsetWidth;
    H = Math.round(W * 0.33);

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    off.width  = W * dpr;
    off.height = H * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fontSize = Math.min(W * 0.275, 190);
    textY    = H * 0.79;
  }

  // ── Text bounding box ──────────────────────────────────────
  function getBounds() {
    offCtx.font        = `bold ${fontSize}px Syne, sans-serif`;
    offCtx.textAlign   = 'center';
    offCtx.textBaseline = 'alphabetic';
    const m   = offCtx.measureText('astta');
    const asc  = m.actualBoundingBoxAscent  ?? fontSize * 0.76;
    const desc = m.actualBoundingBoxDescent ?? fontSize * 0.08;
    return {
      top:    textY - asc,
      bottom: textY + desc,
      height: asc + desc,
      width:  m.width,
    };
  }

  // ── Bubble spawner ─────────────────────────────────────────
  function spawnBubble(bounds) {
    if (fillProgress < 0.04 || fillProgress > 0.94) return;
    if (Math.random() > 0.14) return;

    const liquidTop = bounds.bottom - fillProgress * bounds.height;
    bubbles.push({
      x:       W / 2 + (Math.random() - 0.5) * bounds.width * 0.68,
      y:       liquidTop + 6 + Math.random() * Math.min(25, fillProgress * bounds.height * 0.25),
      r:       0.9 + Math.random() * 2.6,
      speed:   0.35 + Math.random() * 1.3,
      opacity: 0.22 + Math.random() * 0.30,
      phase:   Math.random() * Math.PI * 2,
    });
  }

  function updateBubbles(liquidTop) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y       -= b.speed;
      b.phase   += 0.09;
      b.x       += Math.sin(b.phase) * 0.28;
      b.opacity -= 0.007;
      if (b.opacity <= 0 || b.y < liquidTop - 4) bubbles.splice(i, 1);
    }
  }

  // ── Draw frame ─────────────────────────────────────────────
  function draw() {
    const bounds  = getBounds();
    const fontStr = `bold ${fontSize}px Syne, sans-serif`;

    // ── Main canvas: only the faint stroke outline
    ctx.clearRect(0, 0, W, H);
    ctx.font         = fontStr;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle  = 'rgba(255,255,255,0.08)';
    ctx.lineWidth    = 1;
    ctx.strokeText('astta', W / 2, textY);

    // ── Offscreen: white text → source-in liquid (clips to letters)
    offCtx.clearRect(0, 0, W, H);
    offCtx.globalCompositeOperation = 'source-over';
    offCtx.font         = fontStr;
    offCtx.textAlign    = 'center';
    offCtx.textBaseline = 'alphabetic';
    offCtx.fillStyle    = '#fff';
    offCtx.fillText('astta', W / 2, textY);

    // Switch: everything drawn from here is clipped to the white text pixels
    offCtx.globalCompositeOperation = 'source-in';

    const liquidTop = bounds.bottom - fillProgress * bounds.height;

    // Wave amplitude shrinks as bottle fills (surface settles)
    const amp = Math.max(1.0, 6.0 * (1 - fillProgress * 0.72));

    // Three overlapping sine waves → realistic fluid surface
    offCtx.beginPath();
    offCtx.moveTo(-10, H + 10);
    offCtx.lineTo(-10, liquidTop);
    for (let x = -10; x <= W + 10; x += 2) {
      const s1 = Math.sin(x * 0.017 + time * 2.7)  * amp;
      const s2 = Math.sin(x * 0.033 - time * 1.85) * amp * 0.5;
      const s3 = Math.sin(x * 0.008 + time * 1.05) * amp * 0.32;
      offCtx.lineTo(x, liquidTop + s1 + s2 + s3);
    }
    offCtx.lineTo(W + 10, H + 10);
    offCtx.closePath();
    offCtx.fillStyle = '#fff';
    offCtx.fill();

    // Bubbles — drawn with source-in, so they are automatically clipped
    // to the liquid+text intersection (air pockets inside the white liquid)
    bubbles.forEach(b => {
      offCtx.beginPath();
      offCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      // Dark dot = air bubble inside white liquid
      offCtx.fillStyle = `rgba(0,0,0,${b.opacity})`;
      offCtx.fill();
    });

    // ── Composite offscreen onto main canvas
    ctx.drawImage(off, 0, 0, W, H);
  }

  // ── Animation loop ─────────────────────────────────────────
  function tick() {
    time += 0.016;
    const bounds    = getBounds();
    const liquidTop = bounds.bottom - fillProgress * bounds.height;
    spawnBubble(bounds);
    updateBubbles(liquidTop);
    draw();
    animId = requestAnimationFrame(tick);
  }

  // ── Bootstrap after fonts are ready ───────────────────────
  document.fonts.ready.then(() => {
    setup();
    tick();

    const prog = { val: 0 };
    gsap.to(prog, {
      val: 1,
      duration: 2.8,
      ease: 'power1.inOut',
      delay: 0.2,
      onUpdate() {
        fillProgress = prog.val;
        loaderCount.textContent = Math.round(prog.val * 100) + '%';
      },
      onComplete() {
        cancelAnimationFrame(animId);
        loader.style.pointerEvents = 'none';
        gsap.to(loader, {
          yPercent: -100,
          duration: 1,
          ease: 'expo.inOut',
          onComplete: initHero,
        });
      },
    });
  });
})();

/* ─── Custom cursor ────────────────────────────────────────── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  let mouseX = 0, mouseY = 0;
  let followerX = 0, followerY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.1, ease: 'power3.out' });
  });

  function animateFollower() {
    followerX += (mouseX - followerX) * 0.12;
    followerY += (mouseY - followerY) * 0.12;
    gsap.set(follower, { x: followerX, y: followerY });
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  const hoverTargets = document.querySelectorAll('a, button, .magnetic, .work-card, .service-item');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hovering'));
  });

  document.addEventListener('mouseleave', () => {
    gsap.to([cursor, follower], { opacity: 0, duration: 0.3 });
  });
  document.addEventListener('mouseenter', () => {
    gsap.to([cursor, follower], { opacity: 1, duration: 0.3 });
  });
})();

/* ─── Magnetic buttons ─────────────────────────────────────── */
(function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(el, { x: x * 0.35, y: y * 0.35, duration: 0.4, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });
})();

/* ─── Intro 3D — scroll-driven between About & Services ───── */
(function initIntro3D() {
  const word = document.getElementById('intro3dWord');
  if (!word) return;

  const camera = { perspective: 420 };
  gsap.set(word, { transformPerspective: 420, transformOrigin: '50% 50%', opacity: 0, scale: 0.85 });

  // Fade in as section enters viewport
  ScrollTrigger.create({
    trigger: '#intro-3d',
    start: 'top 80%',
    once: true,
    onEnter: () => {
      gsap.to(word, { opacity: 1, scale: 1, duration: 1.2, ease: 'expo.out' });
    }
  });

  // Scroll-driven 3D rotation — pinned for 300vh
  const scrollTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#intro-3d',
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: 2.5,
      anticipatePin: 1,
    }
  });

  scrollTl
    // Camera zooms in
    .to(camera, {
      perspective: 90,
      duration: 0.78,
      ease: 'none',
      onUpdate: () => gsap.set(word, { transformPerspective: camera.perspective })
    }, 0)
    // Single 360° Y spin
    .to(word, { rotateY: 360, duration: 0.78, ease: 'none' }, 0)
    // Burst exit: scale up + blur + fade
    .to(word, { scale: 2.8, opacity: 0, filter: 'blur(40px)', duration: 0.22, ease: 'power3.in' }, 0.78);
})();

/* ─── Hero animations ──────────────────────────────────────── */
function initHero() {
  const heroTl = gsap.timeline({ delay: 0.1 });

  // Animate each word in hero title
  const words = document.querySelectorAll('.hero-title .word');
  heroTl.fromTo(words, 
    { y: '110%', rotateX: -15, opacity: 0 },
    { y: '0%', rotateX: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12 }
  );

  heroTl.fromTo('.hero-eyebrow',
    { opacity: 0, x: -20 },
    { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out' },
    '-=0.6'
  );

  heroTl.fromTo(['.btn-primary', '.btn-ghost', '.hero-desc', '.hero-scroll-indicator'],
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 },
    '-=0.5'
  );

  // Hero grid parallax
  gsap.to('.hero-bg-grid', {
    yPercent: 20,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
}

/* ─── Navbar scroll effect ─────────────────────────────────── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  ScrollTrigger.create({
    start: 'top -80px',
    onEnter: () => {
      gsap.to(navbar, {
        backdropFilter: 'blur(20px)',
        background: 'rgba(0,0,0,0.8)',
        duration: 0.4
      });
    },
    onLeaveBack: () => {
      gsap.to(navbar, {
        backdropFilter: 'blur(0px)',
        background: 'transparent',
        duration: 0.4
      });
    }
  });
})();

/* ─── Scroll progress bar ──────────────────────────────────── */
(function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  ScrollTrigger.create({
    start: 'top top',
    end: 'max',
    onUpdate: (self) => {
      bar.style.width = (self.progress * 100) + '%';
    }
  });
})();

/* ─── Scroll reveal ────────────────────────────────────────── */
(function initReveal() {
  document.querySelectorAll('.reveal').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      }
    );
  });

  document.querySelectorAll('.reveal-left').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, x: -50 },
      {
        opacity: 1, x: 0,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      }
    );
  });

  document.querySelectorAll('.reveal-scale').forEach((el, i) => {
    gsap.fromTo(el,
      { opacity: 0, scale: 0.94, y: 30 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 1,
        ease: 'expo.out',
        delay: i * 0.06,
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      }
    );
  });
})();

/* ─── Split-title char-by-char reveal ─────────────────────── */
(function initSplitTitles() {
  document.querySelectorAll('.split-title[data-split]').forEach(el => {
    const chars = splitChars(el);
    gsap.fromTo(chars,
      { opacity: 0, y: '120%', rotateX: -90 },
      {
        opacity: 1, y: '0%', rotateX: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.025,
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
      }
    );
  });
})();

/* ─── Work cards — clip-path wipe reveal ──────────────────── */
(function initWorkCards() {
  document.querySelectorAll('.work-card').forEach((card, i) => {
    const clip = card.querySelector('.work-card-clip');
    if (!clip) return;
    gsap.fromTo(clip,
      { clipPath: 'inset(100% 0 0 0)' },
      {
        clipPath: 'inset(0% 0 0 0)',
        duration: 1.3,
        ease: 'expo.inOut',
        delay: i * 0.12,
        scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' }
      }
    );

    // Tilt on hover
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, { rotateY: x * 7, rotateX: -y * 7, transformPerspective: 900, duration: 0.5, ease: 'power2.out' });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    });
  });
})();

/* ─── Animated counters — scramble before landing ─────────── */
(function initCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        // Scramble digits first
        let frame = 0;
        const scrambleDuration = 800;
        const scrambleInterval = setInterval(() => {
          el.textContent = Math.floor(Math.random() * (target * 1.5));
          if ((frame += 40) >= scrambleDuration) clearInterval(scrambleInterval);
        }, 40);
        // Then land on real value
        setTimeout(() => {
          gsap.to({ val: 0 }, {
            val: target,
            duration: 1.5,
            ease: 'power3.out',
            onUpdate: function () { el.textContent = Math.round(this.targets()[0].val) + suffix; }
          });
        }, scrambleDuration);
      }
    });
  });
})();

/* ─── Process line reveal ──────────────────────────────────── */
(function initProcess() {
  document.querySelectorAll('.process-item').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => el.classList.add('in-view')
    });
  });
})();

/* ─── Service items — hover slide + scramble name ─────────── */
(function initServiceItems() {
  document.querySelectorAll('.service-item').forEach(item => {
    const name = item.querySelector('.service-name');
    const originalText = name.textContent;
    let hoverTimeout;

    item.addEventListener('mouseenter', () => {
      gsap.to(name, { x: 14, duration: 0.5, ease: 'expo.out' });
      hoverTimeout = setTimeout(() => scrambleText(name, originalText, 600), 60);
    });
    item.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      name.textContent = originalText;
      gsap.to(name, { x: 0, duration: 0.7, ease: 'expo.out' });
    });
  });
})();

/* ─── Floating orbs parallax ──────────────────────────────── */
(function initOrbs() {
  const orbs = document.querySelectorAll('.orb');
  // Fade in
  gsap.to(orbs, { opacity: 1, duration: 2, ease: 'power2.out', stagger: 0.3, delay: 0.5 });
  // Gentle float animation
  orbs.forEach((orb, i) => {
    gsap.to(orb, {
      y: (i % 2 === 0) ? -40 : 40,
      x: (i % 3 === 0) ? 20 : -20,
      duration: 4 + i * 1.2,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
  });
  // Parallax on scroll
  gsap.to('.orb-1', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5 } });
  gsap.to('.orb-2', { yPercent: 20, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 2 } });
  gsap.to('.orb-3', { yPercent: -50, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
})();

/* ─── Marquee speed up on scroll ──────────────────────────── */
(function initMarqueeScroll() {
  let currentSpeed = 1;
  let targetSpeed = 1;
  const track = document.querySelector('.marquee-track');
  const trackReverse = document.querySelector('.marquee-track--reverse');

  ScrollTrigger.create({
    start: 'top top',
    end: 'max',
    onUpdate: (self) => {
      targetSpeed = 1 + Math.abs(self.getVelocity()) / 800;
      targetSpeed = Math.min(targetSpeed, 6);
    }
  });

  function updateMarquee() {
    currentSpeed += (targetSpeed - currentSpeed) * 0.08;
    targetSpeed += (1 - targetSpeed) * 0.05;
    if (track) track.style.animationDuration = (20 / currentSpeed) + 's';
    if (trackReverse) trackReverse.style.animationDuration = (25 / currentSpeed) + 's';
    requestAnimationFrame(updateMarquee);
  }
  updateMarquee();
})();

/* ─── Section labels stagger from left ────────────────────── */
(function initSectionLabels() {
  document.querySelectorAll('.section-label').forEach(label => {
    gsap.fromTo(label,
      { opacity: 0, x: -30 },
      {
        opacity: 1, x: 0, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: label, start: 'top 90%' }
      }
    );
  });
})();

/* ─── CTA — parallax + shimmer on bg ──────────────────────── */
(function initCtaEffect() {
  gsap.to('.cta-title', {
    yPercent: -12,
    ease: 'none',
    scrollTrigger: { trigger: '.cta-section', start: 'top bottom', end: 'bottom top', scrub: true }
  });

  // Pulse the radial bg
  gsap.to('.cta-bg', {
    scale: 1.4,
    opacity: 0.7,
    duration: 3,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  });
})();

/* ─── Footer split entrance — left & right ────────────────── */
(function initFooter() {
  const footerLeft = document.querySelector('.footer-top > div:first-child');
  const footerRight = document.querySelector('.footer-links-group');
  if (footerLeft) {
    gsap.fromTo(footerLeft,
      { opacity: 0, x: -60 },
      { opacity: 1, x: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: 'footer', start: 'top 90%' } }
    );
  }
  if (footerRight) {
    gsap.fromTo(footerRight,
      { opacity: 0, x: 60 },
      { opacity: 1, x: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: 'footer', start: 'top 90%' } }
    );
  }
})();

/* ─── Navbar active link indicator ────────────────────────── */
(function initNavActive() {
  const sections = ['about', 'services', 'works', 'process', 'contact'];
  const links = document.querySelectorAll('.nav-links a');

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 60%',
      end: 'bottom 60%',
      onEnter: () => setActiveLink(id),
      onEnterBack: () => setActiveLink(id),
    });
  });

  function setActiveLink(id) {
    links.forEach(link => {
      const isActive = link.getAttribute('href') === '#' + id;
      gsap.to(link, { opacity: isActive ? 1 : 0.5, duration: 0.3 });
    });
  }
})();

/* ─── Smooth anchor scroll ─────────────────────────────────── */
(function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        gsap.to(window, { scrollTo: { y: target, offsetY: 80 }, duration: 1.2, ease: 'expo.inOut' });
      }
    });
  });
})();

/* ─── Glitch effect on logo hover ─────────────────────────── */
(function initGlitch() {
  const logo = document.querySelector('.nav-logo');
  if (!logo) return;
  logo.setAttribute('data-text', logo.textContent);
  logo.classList.add('glitch');
})();
