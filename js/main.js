/* ============================================================
   ASIEN-HAUS · interactions & scroll choreography
   GSAP 3.13 (ScrollTrigger, SplitText) + Lenis
   ============================================================ */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const onReady = (fn) => {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  };

  onReady(async () => {
    if (typeof gsap === "undefined") {
      // CDN failed — make sure nothing stays hidden.
      document.querySelector(".loader")?.remove();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const hasSplit = typeof SplitText !== "undefined";
    if (hasSplit) gsap.registerPlugin(SplitText);

    /* ----- Reduced motion: static page, working menu ----- */
    if (reduceMotion) {
      document.querySelector(".loader")?.remove();
      initMenu(null);
      initAnchors(null);
      initNavTheme();
      return;
    }

    // The intro choreography assumes we start at the top.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    // Wait for webfonts so SplitText measures correct line breaks.
    // (fonts.ready can resolve before any font fetch has started, so
    //  explicitly request the two families used for split headlines)
    if (document.fonts) {
      await Promise.race([
        Promise.all([
          document.fonts.load('500 1rem "Fraunces"'),
          document.fonts.load('400 1rem "Space Grotesk"'),
        ]).then(() => document.fonts.ready),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    }

    /* ----- Smooth scroll (Lenis) ----- */
    let lenis = null;
    if (typeof Lenis !== "undefined") {
      lenis = new Lenis({ lerp: 0.105, wheelMultiplier: 1.02 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    const EASE = "expo.out";

    /* ============================================
       Hero intro states (hidden until loader ends)
       ============================================ */
    const heroLines = gsap.utils.toArray(".hero__line-inner");
    let heroChars = heroLines;
    if (hasSplit) {
      heroChars = [];
      heroLines.forEach((line) => {
        const split = new SplitText(line, { type: "chars" });
        heroChars.push(...split.chars);
      });
    }
    gsap.set(heroChars, { yPercent: 120, rotate: 3 });
    gsap.set(".hero__kicker", { autoAlpha: 0, y: 18 });
    gsap.set(".hero__seal", { autoAlpha: 0, scale: 1.9, rotate: 10 });
    gsap.set(".hero__foot > *", { autoAlpha: 0, y: 26 });
    gsap.set(".hero__vertical", { autoAlpha: 0 });

    /* ============================================
       Preloader
       ============================================ */
    const loader = document.querySelector(".loader");
    const countEl = document.querySelector(".loader__count");
    if (lenis) lenis.stop();
    document.documentElement.style.overflow = "hidden";

    const intro = gsap.timeline({
      defaults: { ease: EASE },
      onComplete: () => ScrollTrigger.refresh(),
    });

    const counter = { n: 0 };
    intro
      .from(".loader__word", { autoAlpha: 0, y: 24, duration: 0.7, ease: "power3.out" })
      .to(counter, {
        n: 100,
        duration: 1.35,
        ease: "power2.inOut",
        onUpdate: () => { countEl.textContent = String(Math.round(counter.n)).padStart(2, "0"); },
      }, 0.1)
      .to(loader, {
        yPercent: -100,
        duration: 1.0,
        ease: "expo.inOut",
        onComplete: () => {
          loader.remove();
          document.documentElement.style.overflow = "";
          if (lenis) lenis.start();
        },
      }, ">+0.15")
      // Hero reveal overlapping the curtain lift
      .to(heroChars, {
        yPercent: 0, rotate: 0,
        duration: 1.5,
        stagger: 0.05,
        ease: "expo.out",
      }, "-=0.55")
      .to(".hero__kicker", { autoAlpha: 1, y: 0, duration: 0.9 }, "-=1.1")
      .to(".hero__seal", {
        autoAlpha: 1, scale: 1, rotate: -6,
        duration: 0.75,
        ease: "back.out(2.2)",
      }, "-=0.8")
      .to(".hero__foot > *", { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, "-=0.7")
      .to(".hero__vertical", { autoAlpha: 0.4, duration: 1.2 }, "-=0.6");

    /* ============================================
       Hero scroll parallax
       ============================================ */
    gsap.to(".hero__inner", {
      yPercent: 14,
      autoAlpha: 0.25,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__seal", {
      y: -90,
      rotate: 4,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });

    /* ============================================
       Marquee — infinite, scroll-velocity reactive
       ============================================ */
    const track = document.querySelector(".marquee__track");
    if (track) {
      const marqueeTween = gsap.to(track, { xPercent: -50, duration: 26, ease: "none", repeat: -1 });
      ScrollTrigger.create({
        onUpdate: (self) => {
          const boost = gsap.utils.clamp(1, 5, 1 + Math.abs(self.getVelocity()) / 900);
          gsap.to(marqueeTween, { timeScale: boost, duration: 0.3, overwrite: true });
        },
      });
      // ease back to cruise speed
      gsap.ticker.add(() => {
        if (!ScrollTrigger.isScrolling()) {
          marqueeTween.timeScale(gsap.utils.interpolate(marqueeTween.timeScale(), 1, 0.05));
        }
      });
    }

    /* ============================================
       Split headings & paragraphs
       ============================================ */
    if (hasSplit) {
      gsap.utils.toArray(".split-words").forEach((el) => {
        SplitText.create(el, {
          type: "words",
          mask: "words",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.words, {
              yPercent: 115,
              duration: 1.25,
              stagger: 0.045,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start: "top 82%", once: true },
            }),
        });
      });
      gsap.utils.toArray(".split-lines").forEach((el) => {
        SplitText.create(el, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              stagger: 0.085,
              ease: "expo.out",
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            }),
        });
      });
    } else {
      gsap.utils.toArray(".split-words, .split-lines").forEach((el) => el.classList.add("reveal"));
    }

    /* ============================================
       Generic reveals
       ============================================ */
    gsap.set(".reveal", { y: 36, autoAlpha: 0 });
    ScrollTrigger.batch(".reveal", {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.09, ease: "expo.out" }),
    });

    /* Product list rows */
    const rows = gsap.utils.toArray(".plist__row");
    gsap.set(rows, { y: 44, autoAlpha: 0 });
    ScrollTrigger.batch(rows, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.15, stagger: 0.07, ease: "expo.out" }),
    });

    /* About watermark glyph parallax */
    gsap.fromTo(".about__glyph", { y: 60 }, {
      y: -60,
      ease: "none",
      scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true },
    });

    /* ============================================
       Stats counters
       ============================================ */
    gsap.utils.toArray(".stats__num").forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      const digits = String(target).length;
      const state = { n: 0 };
      el.textContent = "0".padStart(digits, "0") + suffix;
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () =>
          gsap.to(state, {
            n: target,
            duration: 1.8,
            ease: "expo.out",
            onUpdate: () => {
              el.textContent = String(Math.round(state.n)).padStart(digits, "0") + suffix;
            },
          }),
      });
    });

    /* ============================================
       Imbiss bowl — draw-in + looping steam
       ============================================ */
    const bowlLines = gsap.utils.toArray(".imbiss__bowl .bowl-line");
    bowlLines.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    });
    ScrollTrigger.create({
      trigger: ".imbiss__bowl",
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(bowlLines, {
          strokeDashoffset: 0,
          duration: 1.6,
          stagger: 0.12,
          ease: "power3.inOut",
        });
      },
    });
    gsap.utils.toArray(".imbiss__bowl .steam").forEach((p, i) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
      gsap.timeline({ repeat: -1, delay: i * 0.55 })
        .to(p, { strokeDashoffset: 0, opacity: 0.85, duration: 1.3, ease: "power1.inOut" })
        .to(p, { strokeDashoffset: -len, opacity: 0, duration: 1.3, ease: "power1.inOut" })
        .to({}, { duration: 0.5 });
    });
    gsap.to(".imbiss__bowl svg", {
      y: -10,
      duration: 2.6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });

    /* ============================================
       Footer wordmark drift
       ============================================ */
    gsap.fromTo(".footer__big", { xPercent: -5 }, {
      xPercent: 5,
      ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true },
    });

    /* ============================================
       Nav: theme flip + hide on scroll down
       ============================================ */
    initNavTheme();

    const nav = document.querySelector(".nav");
    const navY = gsap.quickTo(nav, "yPercent", { duration: 0.6, ease: "expo.out" });
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (document.body.classList.contains("menu-open")) return;
        nav.classList.toggle("is-scrolled", self.scroll() > 80);
        if (self.direction === 1 && self.scroll() > 520) navY(-130);
        else navY(0);
      },
    });

    /* ============================================
       Menu, anchors, cursor, magnetic buttons
       ============================================ */
    initMenu(lenis);
    initAnchors(lenis);
    if (finePointer) {
      initCursor();
      initMagnetic();
    }
  });

  /* ----------------------------------------------------------
     Nav color theme — dark text over light sections
     ---------------------------------------------------------- */
  function initNavTheme() {
    const nav = document.querySelector(".nav");
    const lightSections = document.querySelectorAll(".about, .laden, .imbiss, .marquee");
    if (!nav || !lightSections.length) return;
    const active = new Set();
    if (typeof ScrollTrigger === "undefined") return;
    lightSections.forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: "top 44px",
        end: "bottom 44px",
        onToggle: (self) => {
          if (self.isActive) active.add(sec);
          else active.delete(sec);
          nav.classList.toggle("theme-dark", active.size > 0);
        },
      });
    });
  }

  /* ----------------------------------------------------------
     Mobile fullscreen menu
     ---------------------------------------------------------- */
  function initMenu(lenis) {
    const burger = document.querySelector(".nav__burger");
    const menu = document.querySelector(".menu");
    if (!burger || !menu) return;

    let open = false;
    let tl = null;

    if (typeof gsap !== "undefined" && !reduceMotionStatic()) {
      tl = gsap.timeline({ paused: true, defaults: { ease: "expo.inOut" } });
      tl.set(menu, { visibility: "visible" })
        .fromTo(menu, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.85 })
        .from(".menu__links a", { yPercent: 60, autoAlpha: 0, duration: 0.7, stagger: 0.06, ease: "expo.out" }, "-=0.35")
        .from(".menu__foot", { autoAlpha: 0, y: 20, duration: 0.5, ease: "power2.out" }, "-=0.4");
    }

    const setOpen = (v) => {
      open = v;
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("menu-open", open);
      document.querySelector(".nav")?.classList.toggle("is-menu", open);
      if (tl) { open ? tl.play() : tl.reverse(); }
      else { menu.style.visibility = open ? "visible" : "hidden"; menu.style.clipPath = open ? "inset(0)" : ""; }
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      else { document.documentElement.style.overflow = open ? "hidden" : ""; }
    };

    burger.addEventListener("click", () => setOpen(!open));
    menu.querySelectorAll("a[data-scroll]").forEach((a) =>
      a.addEventListener("click", () => setOpen(false))
    );
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) setOpen(false); });
  }

  /* ----------------------------------------------------------
     Smooth anchors
     ---------------------------------------------------------- */
  function initAnchors(lenis) {
    document.querySelectorAll('a[data-scroll][href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        if (lenis) {
          setTimeout(() => lenis.scrollTo(target, { duration: 1.5 }), 60);
        } else {
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Custom cursor
     ---------------------------------------------------------- */
  function initCursor() {
    const cursor = document.querySelector(".cursor");
    if (!cursor) return;
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");

    const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    let seen = false;
    window.addEventListener("mousemove", (e) => {
      if (!seen) {
        seen = true;
        gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
        cursor.classList.remove("is-hidden");
      }
      dotX(e.clientX); dotY(e.clientY);
      ringX(e.clientX); ringY(e.clientY);
    }, { passive: true });

    const interactive = "a, button, .plist__row";
    document.addEventListener("mouseover", (e) => {
      cursor.classList.toggle("is-active", !!e.target.closest(interactive));
    });
    document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("mouseenter", () => cursor.classList.remove("is-hidden"));
  }

  /* ----------------------------------------------------------
     Magnetic buttons
     ---------------------------------------------------------- */
  function initMagnetic() {
    document.querySelectorAll(".btn").forEach((btn) => {
      const label = btn.querySelector(".btn__label");
      const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3.out" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3.out" });
      const lx = label ? gsap.quickTo(label, "x", { duration: 0.4, ease: "power3.out" }) : null;
      const ly = label ? gsap.quickTo(label, "y", { duration: 0.4, ease: "power3.out" }) : null;

      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const relX = e.clientX - (r.left + r.width / 2);
        const relY = e.clientY - (r.top + r.height / 2);
        xTo(relX * 0.32); yTo(relY * 0.32);
        if (lx) { lx(relX * 0.12); ly(relY * 0.12); }
      });
      btn.addEventListener("mouseleave", () => {
        xTo(0); yTo(0);
        if (lx) { lx(0); ly(0); }
      });
    });
  }

  function reduceMotionStatic() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
})();
