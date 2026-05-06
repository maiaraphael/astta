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
  const canvas     = document.getElementById('loaderCanvas');
  const ctx        = canvas.getContext('2d');
  const dpr        = window.devicePixelRatio || 1;

  // Offscreen canvas used for the text-mask compositing trick
  const off    = document.createElement('canvas');
  const offCtx = off.getContext('2d');

  let W, H, fontSize, textY;
  let fillProgress = 0; // 0 = empty → 1 = full
  let time         = 0;
  let lastTs       = null;
  let animId;
  let charWidths   = null; // cached char widths — recalculated only on setup

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
    charWidths = null; // invalidate cache — will be rebuilt on next draw
  }

  // ── Text bounding box ──────────────────────────────────────
  function getBounds() {
    offCtx.font        = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
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
  const CHARS = ['a','s','t','t','a'];

  // Cache char widths so measureText is never called inside the draw loop
  function cacheCharWidths() {
    const fontStr = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    offCtx.font      = fontStr;
    offCtx.textAlign = 'left';
    const totalW = offCtx.measureText('astta').width;
    charWidths = {
      widths:  CHARS.map(ch => offCtx.measureText(ch).width),
      total:   totalW,
      startX:  W / 2 - totalW / 2,
    };
  }

  // Per-character float — each letter bobs on its own sine wave
  function charFloatY(i) {
    return Math.sin(time * 1.1 + i * 1.15) * 5.5;
  }

  // Draw "astta" char-by-char so each letter can have its own Y offset
  function drawCharsFloat(context, mode /* 'fill' | 'stroke' */) {
    const fontStr = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    context.font         = fontStr;
    context.textAlign    = 'left';
    context.textBaseline = 'alphabetic';
    let cx = charWidths.startX;
    CHARS.forEach((ch, i) => {
      const y = textY + charFloatY(i);
      if (mode === 'fill')   context.fillText(ch, cx, y);
      else                   context.strokeText(ch, cx, y);
      cx += charWidths.widths[i];
    });
  }

  function draw() {
    const bounds  = getBounds();
    const fontStr = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;

    // ── Main canvas: only the faint stroke outline
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle  = 'rgba(255,255,255,0.08)';
    ctx.lineWidth    = 1;
    drawCharsFloat(ctx, 'stroke');

    // ── Offscreen: white text → source-in liquid (clips to letters)
    offCtx.clearRect(0, 0, W, H);
    offCtx.globalCompositeOperation = 'source-over';
    offCtx.fillStyle    = '#fff';
    drawCharsFloat(offCtx, 'fill');

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

    // Bubbles — destination-out cuts transparent holes in the white liquid
    // (shows black background through = air bubbles inside liquid)
    offCtx.globalCompositeOperation = 'destination-out';
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
  function tick(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05); // seconds, capped at 50ms
    lastTs = ts;
    time += dt;
    if (!charWidths) cacheCharWidths(); // build cache after fonts/setup are ready
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
    animId = requestAnimationFrame(tick);

    const prog = { val: 0 };
    gsap.to(prog, {
      val: 1,
      duration: 2.8,
      ease: 'power1.inOut',
      delay: 0.2,
      onUpdate() {
        fillProgress = prog.val;
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
  const section = document.getElementById('intro-3d');
  const word    = document.getElementById('intro3dWord');
  if (!word || !section) return;

  // Inject glow element
  const scene = section.querySelector('.intro-3d-scene');
  const glow  = document.createElement('div');
  glow.className = 'intro-3d-glow';
  scene.appendChild(glow);

  // Split "astta" into individual char spans
  word.textContent = '';
  const charEls = Array.from('astta').map(ch => {
    const span = document.createElement('span');
    span.className = 'intro-char';
    span.textContent = ch;
    word.appendChild(span);
    return span;
  });

  const W = window.innerWidth;
  const H = window.innerHeight;

  // Where each letter arrives FROM (off-screen corners / extremes)
  const origins = [
    { x: -W * 1.4, y: -H * 0.75, rotateZ: -50, scale: 0.3 }, // 'a' — top-left
    { x:  W * 0.6, y: -H * 1.3,  rotateZ:  30, scale: 0.3 }, // 's' — top-right
    { x:  0,        y:  0,         rotateZ: 180, scale: 0   }, // 't' — center, born spinning
    { x: -W * 0.6, y:  H * 1.3,  rotateZ: -30, scale: 0.3 }, // 't' — bottom-left
    { x:  W * 1.4, y:  H * 0.75, rotateZ:  50, scale: 0.3 }, // 'a' — bottom-right
  ];

  // Where each letter EXITS to (starburst scatter)
  const exits = [
    { x: -W * 1.0, y: -H * 1.2, rotateZ: -110, scale: 5  },
    { x:  W * 0.4, y: -H * 1.5, rotateZ:   50, scale: 4  },
    { x:  0,        y:  0,        rotateZ:    0, scale: 16 }, // center 't' fills screen
    { x: -W * 0.4, y:  H * 1.5, rotateZ:  -50, scale: 4  },
    { x:  W * 1.0, y:  H * 1.2, rotateZ:  110, scale: 5  },
  ];

  // Set initial state — all invisible, at their origin positions
  charEls.forEach((ch, i) => {
    gsap.set(ch, { x: origins[i].x, y: origins[i].y, rotateZ: origins[i].rotateZ, scale: origins[i].scale, opacity: 0, filter: 'blur(35px)' });
  });
  gsap.set(glow, { opacity: 0 });

  // ── Master scroll timeline — pin starts at top top ──────────
  const postIntro   = document.getElementById('post-intro');
  const screenFlash = document.getElementById('screen-flash');
  let flashTween = null;

  function setInverted(on) {
    if (postIntro) postIntro.classList.toggle('inverted', on);
    section.classList.toggle('inverted-bg', on);
  }

  // Flash constants — must match the scatter phase timing below
  // tl total duration ≈ 11.52  (last scatter ends at 7.72+3.8)
  // Flash fromTo: start=7.36, end=11.16  →  progress 0.638 → 0.968
  const FLASH_P0 = 0.638;
  const FLASH_P1 = 0.968;

  gsap.set(screenFlash, { opacity: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=420%',
      pin: true,
      scrub: 1.6,
      anticipatePin: 1,
      // onUpdate drives flash in BOTH directions — forward AND rewind
      onUpdate: (self) => {
        if (flashTween) return; // dissolve tween (post-pin) is running, leave it alone
        const t = Math.max(0, Math.min(1, (self.progress - FLASH_P0) / (FLASH_P1 - FLASH_P0)));
        gsap.set(screenFlash, { opacity: t * t }); // power2 ease baked in
      },
      onLeave: () => {
        // Pin released going down — flash=1 from onUpdate, dissolve to reveal white sections
        if (flashTween) flashTween.kill();
        setInverted(true); // post-intro → white, intro-3d bg → white (all hidden by flash)
        flashTween = gsap.to(screenFlash, {
          opacity: 0, duration: 1.2, ease: 'power2.inOut',
          onComplete: () => { flashTween = null; }
        });
      },
      onEnterBack: () => {
        // Re-entering pin from below going UP
        // flash=1 covers the visual snap, then onUpdate drives it to 0 as T rewinds
        if (flashTween) { flashTween.kill(); flashTween = null; }
        gsap.set(screenFlash, { opacity: 1 });
        setInverted(false); // intro-3d bg → BLACK so rewind animation is visible on black
      },
      onLeaveBack: () => {
        // Exiting pin upward — onUpdate has driven flash to 0, just ensure clean state
        if (flashTween) { flashTween.kill(); flashTween = null; }
        setInverted(false);
        gsap.set(screenFlash, { opacity: 0 });
      }
    }
  });

  // Phase 1 — Arrival: each char flies in from its corner (staggered)
  charEls.forEach((ch, i) => {
    tl.to(ch,
      { x: 0, y: 0, rotateZ: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 4, ease: 'expo.out' },
      i * 0.55 // stagger start times
    );
  });

  // Glow pulses on at peak assembly
  tl.to(glow, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 4.5);

  // Phase 2 — Dwell: word breathes once, very subtle
  tl.to(charEls, { scaleY: 1.06, skewX: 3,  duration: 0.5, ease: 'power1.inOut', stagger: 0.07 }, 5.2);
  tl.to(charEls, { scaleY: 1,    skewX: 0,  duration: 0.5, ease: 'power1.inOut', stagger: 0.07 }, 5.9);

  // Glow fades
  tl.to(glow, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 6.2);

  // Phase 3 — Scatter: starburst exit, each char flies to its corner
  // Centre 't' (i=2) expands to fill screen white — stays opaque to bridge into inverted sections
  charEls.forEach((ch, i) => {
    if (i === 2) {
      tl.to(ch,
        { scale: exits[i].scale, opacity: 1, filter: 'blur(0px)', duration: 3.8, ease: 'power3.in' },
        7 + i * 0.18
      );
    } else {
      tl.to(ch,
        { x: exits[i].x, y: exits[i].y, rotateZ: exits[i].rotateZ, scale: exits[i].scale, opacity: 0, filter: 'blur(30px)', duration: 3.8, ease: 'power3.in' },
        7 + i * 0.18
      );
    }
  });


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
        scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' }
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
        scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' }
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
        scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' }
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
        scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' }
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
        scrollTrigger: { trigger: card, start: 'top 95%', toggleActions: 'play none none none' }
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
      start: 'top 95%',
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
      start: 'top 95%',
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
        scrollTrigger: { trigger: label, start: 'top 95%' }
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
      { opacity: 1, x: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: 'footer', start: 'top 95%' } }
    );
  }
  if (footerRight) {
    gsap.fromTo(footerRight,
      { opacity: 0, x: 60 },
      { opacity: 1, x: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: 'footer', start: 'top 95%' } }
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

/* ─── Hamburger mobile menu ────────────────────────────────── */
(function initHamburger() {
  const btn   = document.getElementById('hamburger');
  const menu  = document.getElementById('mobileMenu');
  const links = document.querySelectorAll('.mobile-link');
  const cta   = menu && menu.querySelector('.mobile-cta');
  const foot  = menu && menu.querySelector('.mobile-menu-foot');
  if (!btn || !menu) return;

  let isOpen = false;
  let openTl = null;

  function openMenu() {
    isOpen = true;
    btn.classList.add('is-open');
    menu.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (openTl) openTl.kill();
    openTl = gsap.timeline();
    openTl
      .fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' })
      .fromTo(links,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out', stagger: 0.07 },
        '-=0.2'
      )
      .fromTo([cta, foot].filter(Boolean),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out', stagger: 0.1 },
        '-=0.2'
      );
  }

  function closeMenu() {
    isOpen = false;
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';

    if (openTl) openTl.kill();
    gsap.to(menu, {
      opacity: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        // Reset link positions for next open
        gsap.set([...links, cta, foot].filter(Boolean), { opacity: 0, y: 40 });
        gsap.set([cta, foot].filter(Boolean), { y: 20 });
      }
    });
  }

  btn.addEventListener('click', () => isOpen ? closeMenu() : openMenu());

  // Close on any mobile link click
  menu.querySelectorAll('.mobile-link, .mobile-cta').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });
})();

/* ─── Tab FOMO title ───────────────────────────────────────── */
(function initTabFomo() {
  const original = document.title;
  const away     = '👀 Ainda por aqui? — Astta';
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? away : original;
  });
})();
