gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

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
  const hint = document.getElementById('intro3dHint');

  // Entrance: word rises from below after loader
  const entranceTl = gsap.timeline();
  entranceTl
    .fromTo(word,
      { opacity: 0, y: 80, rotateX: -30, scale: 0.85 },
      { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 1.4, ease: 'expo.out' }
    )
    .fromTo(hint,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' },
      '-=0.5'
    );

  // Scroll-driven 3D rotation — pin for 3x viewport height
  const scrollTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#intro-3d',
      start: 'top top',
      end: '+=280%',
      pin: true,
      scrub: 1.8,
      anticipatePin: 1,
    }
  });

  // Phase 1 (0 → 50%): hint fades, rotation begins
  scrollTl
    .to(hint, { opacity: 0, y: -20, duration: 0.1, ease: 'none' }, 0)

    // Phase 2 (0 → 75%): full 360° Y rotation with X tilt
    .to(word, {
      rotateY: 360,
      rotateX: 18,
      scale: 1.05,
      duration: 0.75,
      ease: 'none',
    }, 0)

    // Phase 3 (75% → 100%): scale up + fade out — reveals hero
    .to(word, {
      scale: 1.6,
      opacity: 0,
      filter: 'blur(20px)',
      duration: 0.25,
      ease: 'power2.in',
    }, 0.75);

  // After intro unpins, animate hero title with ScrollTrigger
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

/* ─── Scroll reveal ────────────────────────────────────────── */
(function initReveal() {
  // Generic reveal
  document.querySelectorAll('.reveal').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Reveal left
  document.querySelectorAll('.reveal-left').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, x: -50 },
      {
        opacity: 1, x: 0,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Reveal scale
  document.querySelectorAll('.reveal-scale').forEach((el, i) => {
    gsap.fromTo(el,
      { opacity: 0, scale: 0.94, y: 30 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 1,
        ease: 'expo.out',
        delay: i * 0.06,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });
})();

/* ─── Animated counters ────────────────────────────────────── */
(function initCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.getAttribute('data-count'));
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      onEnter: () => {
        gsap.to({ val: 0 }, {
          val: target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: function () {
            el.textContent = Math.round(this.targets()[0].val);
          }
        });
      },
      once: true
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

/* ─── Service items hover animation ───────────────────────── */
(function initServiceItems() {
  document.querySelectorAll('.service-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      gsap.to(item.querySelector('.service-name'), {
        x: 12,
        duration: 0.5,
        ease: 'expo.out'
      });
    });
    item.addEventListener('mouseleave', () => {
      gsap.to(item.querySelector('.service-name'), {
        x: 0,
        duration: 0.6,
        ease: 'expo.out'
      });
    });
  });
})();

/* ─── Work card tilt effect ────────────────────────────────── */
(function initCardTilt() {
  document.querySelectorAll('.work-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotateY: x * 6,
        rotateX: -y * 6,
        transformPerspective: 800,
        duration: 0.5,
        ease: 'power2.out'
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)'
      });
    });
  });
})();

/* ─── CTA section parallax text ───────────────────────────── */
(function initCtaEffect() {
  gsap.to('.cta-title', {
    yPercent: -15,
    ease: 'none',
    scrollTrigger: {
      trigger: '.cta-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });
})();

/* ─── Section numbers fade on scroll ──────────────────────── */
(function initSectionLabels() {
  document.querySelectorAll('.section-label').forEach(label => {
    gsap.fromTo(label,
      { opacity: 0, x: -20 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: label,
          start: 'top 90%'
        }
      }
    );
  });
})();

/* ─── Smooth anchor scroll ─────────────────────────────────── */
(function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        gsap.to(window, {
          scrollTo: { y: target, offsetY: 80 },
          duration: 1.2,
          ease: 'expo.inOut'
        });
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
