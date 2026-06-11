/* ============================================================
   ASIEN-HAUS · hero scene
   Rising embers / incense particles + glowing lantern disc
   Three.js (module), graceful fallback to CSS gradient
   ============================================================ */

const canvas = document.getElementById("scene");
const hero = document.querySelector(".hero");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!canvas || !hero) {
  // nothing to do
} else if (reduceMotion || !window.WebGLRenderingContext) {
  hero.classList.add("hero--fallback");
} else {
  init().catch(() => hero.classList.add("hero--fallback"));
}

async function init() {
  const THREE = await import("three");

  // Palette is themeable per page via data attributes on the canvas.
  const ds = canvas.dataset;
  const PALETTE = {
    p1: ds.p1 || "#e9b452",        // particle: main (gold)
    p2: ds.p2 || "#f6ecce",        // particle: bright (champagne)
    p3: ds.p3 || "#9fb4e6",        // particle: tertiary (moonlight blue)
    glowA: ds.glowA || "#e3a93c",  // lantern core
    glowB: ds.glowB || "#c98a23",  // lantern edge
    glow2A: ds.glow2A || "#3550b2", // secondary glow core
    glow2B: ds.glow2B || "#22336e", // secondary glow edge
  };

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
  camera.position.set(0, 0, 16);

  const isMobile = window.matchMedia("(max-width: 760px)").matches;

  /* ---------- Lantern glow discs ---------- */
  const discMaterial = (colorA, colorB, intensity) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(colorA) },
        uColorB: { value: new THREE.Color(colorB) },
        uIntensity: { value: intensity },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(0.5));
          float pulse = 0.92 + 0.08 * sin(uTime * 0.7);
          float glow = smoothstep(0.5, 0.0, d) * pulse;
          glow = pow(glow, 1.8);
          vec3 col = mix(uColorB, uColorA, smoothstep(0.42, 0.0, d));
          gl_FragColor = vec4(col, glow * uIntensity);
        }
      `,
    });

  const lantern = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 17),
    discMaterial(PALETTE.glowA, PALETTE.glowB, 0.62)
  );
  lantern.position.set(isMobile ? 1.5 : 5.2, 2.2, -6);
  scene.add(lantern);

  const emberGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    discMaterial(PALETTE.glow2A, PALETTE.glow2B, 0.3)
  );
  emberGlow.position.set(isMobile ? -3 : -6.5, -3.5, -7);
  scene.add(emberGlow);

  /* ---------- Particle field (rising embers) ---------- */
  const COUNT = isMobile ? 1100 : 2400;
  const SPREAD_X = 26;
  const SPREAD_Y = 18;
  const SPREAD_Z = 10;

  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * SPREAD_X;
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z;
    seeds[i] = Math.random();
    sizes[i] = 0.5 + Math.random() * 1.6;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uEmber: { value: new THREE.Color(PALETTE.p1) },
      uCream: { value: new THREE.Color(PALETTE.p2) },
      uGold: { value: new THREE.Color(PALETTE.p3) },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vSeed;
      varying float vFade;

      void main() {
        vSeed = aSeed;

        vec3 p = position;
        float speed = 0.35 + aSeed * 0.85;

        // rise & wrap vertically
        float travel = uTime * speed;
        p.y = mod(position.y + travel + ${(SPREAD_Y / 2).toFixed(1)}, ${SPREAD_Y.toFixed(1)}) - ${(SPREAD_Y / 2).toFixed(1)};

        // gentle sideways drift, stronger higher up
        float sway = sin(uTime * (0.4 + aSeed) + aSeed * 6.2831) * (0.4 + aSeed * 0.5);
        p.x += sway * smoothstep(-${(SPREAD_Y / 2).toFixed(1)}, ${(SPREAD_Y / 2).toFixed(1)}, p.y);
        p.z += cos(uTime * 0.3 + aSeed * 6.2831) * 0.35;

        // fade near top & bottom of the volume
        float edge = abs(p.y) / ${(SPREAD_Y / 2).toFixed(1)};
        vFade = 1.0 - smoothstep(0.62, 1.0, edge);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio * 42.0 / -mv.z;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uEmber;
      uniform vec3 uCream;
      uniform vec3 uGold;
      varying float vSeed;
      varying float vFade;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float alpha = smoothstep(0.5, 0.06, d);
        alpha *= alpha;

        vec3 col = uEmber;
        if (vSeed > 0.72) col = uCream;
        else if (vSeed > 0.5) col = uGold;

        float twinkle = 0.65 + 0.35 * sin(vSeed * 100.0);
        gl_FragColor = vec4(col, alpha * vFade * twinkle * 0.85);
      }
    `,
  });

  const particles = new THREE.Points(geometry, particleMaterial);
  scene.add(particles);

  /* ---------- Sizing ---------- */
  const setSize = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.6 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    particleMaterial.uniforms.uPixelRatio.value = dpr;
  };
  setSize();
  window.addEventListener("resize", setSize);

  /* ---------- Pointer parallax ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---------- Render loop (paused when hero offscreen) ---------- */
  let visible = true;
  let rafId = null;
  const clock = new THREE.Clock();
  let elapsed = 0;

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && rafId === null) loop();
  }, { threshold: 0 });
  io.observe(hero);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible && rafId === null) loop();
  });

  let shown = false;
  function loop() {
    if (!visible || document.hidden) { rafId = null; return; }
    rafId = requestAnimationFrame(loop);

    elapsed += Math.min(clock.getDelta(), 0.05);

    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camera.position.x = pointer.x * 0.9;
    camera.position.y = -pointer.y * 0.55;
    camera.lookAt(0, 0, 0);

    particleMaterial.uniforms.uTime.value = elapsed;
    lantern.material.uniforms.uTime.value = elapsed;
    emberGlow.material.uniforms.uTime.value = elapsed + 2.4;

    renderer.render(scene, camera);

    // fade the canvas in once a real frame has been drawn
    if (!shown) {
      shown = true;
      canvas.classList.add("is-on");
    }
  }

  loop();
}
