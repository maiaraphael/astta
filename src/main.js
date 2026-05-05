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

/* ─── Loader ─────────────────────────────────────────────── */
(function initLoader() {
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const loaderCount = document.getElementById('loaderCount');
  const loaderLogo = document.querySelector('.loader-logo span');

  const tl = gsap.timeline({
    onComplete: () => {
      loader.style.pointerEvents = 'none';
      initIntro3D();
    }
  });

  tl.to(loaderLogo, { y: '0%', duration: 0.8, ease: 'expo.out', delay: 0.2 })
    .to(loaderBar, {
      scaleX: 1,
      duration: 1.2,
      ease: 'expo.inOut',
      onUpdate: function () {
        const progress = Math.round(this.progress() * 100);
        loaderCount.textContent = progress + '%';
      }
    }, '-=0.3')
    .to([loaderBar, loaderLogo, loaderCount], { opacity: 0, duration: 0.4, ease: 'power2.in' }, '+=0.2')
    .to(loader, {
      yPercent: -100,
      duration: 1,
      ease: 'expo.inOut',
    }, '-=0.1');
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

/* ─── Intro 3D — scroll-driven rotation ───────────────────── */
function initIntro3D() {
  const word = document.getElementById('intro3dWord');
  const scene = document.querySelector('.intro-3d-scene');
  const hint = document.getElementById('intro3dHint');

  // Camera perspective state — starts far, zooms in during scroll
  const camera = { perspective: 420 };

  // Set initial transformPerspective on the word for crisp 3D
  gsap.set(word, { transformPerspective: 420, transformOrigin: '50% 50%' });

  // Entrance: word fades in cleanly
  const entranceTl = gsap.timeline();
  entranceTl
    .fromTo(word,
      { opacity: 0, y: 60, rotateX: -20 },
      { opacity: 1, y: 0, rotateX: 0, duration: 1.5, ease: 'expo.out' }
    )
    .fromTo(hint,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' },
      '-=0.5'
    );

  // Scroll-driven — pinned for 320vh = more cinematic breathing room
  const scrollTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#intro-3d',
      start: 'top top',
      end: '+=320%',
      pin: true,
      scrub: 2.5,          // higher = smoother, more buttery
      anticipatePin: 1,
    }
  });

  scrollTl
    // Hint fades immediately
    .to(hint, { opacity: 0, y: -15, duration: 0.08, ease: 'none' }, 0)

    // Camera zooms in: perspective shrinks = viewer rushes toward word
    .to(camera, {
      perspective: 90,
      duration: 0.78,
      ease: 'none',
      onUpdate: () => {
        gsap.set(word, { transformPerspective: camera.perspective });
      }
    }, 0)

    // One clean 360° Y rotation — no extra tilt on X so it reads as a single confident spin
    .to(word, {
      rotateY: 360,
      duration: 0.78,
      ease: 'none',
    }, 0)

    // Final burst: scale up huge + blur + fade — camera "flies through" the word
    .to(word, {
      scale: 2.8,
      opacity: 0,
      filter: 'blur(40px)',
      duration: 0.22,
      ease: 'power3.in',
    }, 0.78);

  // Hero entrance fires when it enters the viewport after unpin
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top 80%',
    once: true,
    onEnter: initHero,
  });
}

/* ─── Hero animations ──────────────────────────────────────── */
function initHero() {
  const heroTl = gsap.timeline();

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
