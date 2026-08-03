/* ═══════════════════════════════════════════════════════════════
   CASA TINASSI — main.js
   1. Revelação suave dos elementos ao rolar
   2. PILATES 3D — pessoa executa o movimento no Reformer conforme
      a página desce (teaser com alças)
   3. MIRIAM · PSICOLOGIA 3D — busto de cabeça aberta de onde flores
      desabrocham conforme o painel sobe na tela
   O Hero agora é ilustração estática (SVG) em três colunas — sem 3D.
   Tudo respeita `prefers-reduced-motion` e usa SÓ as duas cores.
   ═══════════════════════════════════════════════════════════════ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* As duas cores da casa, também no 3D */
const COR_VERDE = 0x5c684a;
const COR_CREME = 0xf4eedf;

/* Utilidades matemáticas */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, v) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Progresso de um "scrub": 0 quando a seção encosta no topo da
   tela, 1 quando o palco fixo termina o percurso. */
function scrubProgress(el) {
  const rect = el.getBoundingClientRect();
  const range = rect.height - window.innerHeight;
  if (range <= 0) return 0;
  return clamp(-rect.top / range, 0, 1);
}

const isMobile = () => window.innerWidth < 1060;

/* ──────────────────────────────────────────────────────────────
   1. REVELAÇÃO AO ROLAR
   ────────────────────────────────────────────────────────────── */
const revealEls = document.querySelectorAll('.reveal');
if (reduceMotion) {
  revealEls.forEach(el => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
}

/* ──────────────────────────────────────────────────────────────
   Sem Three.js (sem internet)? Os canvases 3D somem, os scrubs
   viram seções de altura normal e o site segue completo.
   ────────────────────────────────────────────────────────────── */
if (!window.THREE) {
  document.documentElement.classList.add('no3d');
  ['pilatesCanvas', 'florCanvas'].forEach(id => {
    const c = document.getElementById(id);
    if (c) c.style.display = 'none';
  });
  // o painel da cabeça florescendo some inteiro (o texto continua)
  const painelFlor = document.querySelector('.stage__panel--3d');
  if (painelFlor) painelFlor.style.display = 'none';
  document.querySelectorAll('.scrub').forEach(s => { s.style.height = 'auto'; s.style.minHeight = '100svh'; });
  document.querySelectorAll('.scrub__hint').forEach(h => { h.style.display = 'none'; });
}

/* Parallax de mouse compartilhado pelas cenas */
let mouseX = 0, mouseY = 0;
window.addEventListener('pointermove', e => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

/* Montagem padrão de renderer + luzes (mesmo clima em toda cena) */
function cenaBase(THREE, canvas, { alpha = false } = {}) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  if (!alpha) renderer.setClearColor(COR_VERDE);

  scene.add(new THREE.HemisphereLight(COR_CREME, COR_VERDE, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.position.set(3, 5, 2);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  return { scene, renderer };
}

/* ──────────────────────────────────────────────────────────────
   2. PILATES — a pessoa faz o movimento conforme a página desce
   Reformer com estrutura creme e estofado verde; sobre ele, uma
   figura creme deitada que sobe ao "teaser" (tronco e pernas em V,
   braços à frente) e volta, no ritmo do scroll. Dá para arrastar
   para girar o aparelho.
   ────────────────────────────────────────────────────────────── */
(function pilatesScene() {
  if (!window.THREE) return;
  const canvas = document.getElementById('pilatesCanvas');
  if (!canvas) return;
  const THREE = window.THREE;
  const scrubEl = document.getElementById('pilates');
  const host = canvas.parentElement;

  const { scene, renderer } = cenaBase(THREE, canvas);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0.4, 1.5, 4.8);
  camera.lookAt(0, 0.45, 0);

  const M = {
    frame: new THREE.MeshStandardMaterial({ color: COR_CREME, roughness: 0.55 }),
    pad:   new THREE.MeshStandardMaterial({ color: COR_VERDE, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: COR_CREME, roughness: 0.4, metalness: 0.35 }),
    corpo: new THREE.MeshStandardMaterial({ color: COR_CREME, roughness: 0.6 }),
    detalhe: new THREE.MeshStandardMaterial({ color: COR_VERDE, roughness: 0.7 }),
  };
  const box = (wx, wy, wz, mat) => new THREE.Mesh(new THREE.BoxGeometry(wx, wy, wz), mat);

  const rig = new THREE.Group();
  rig.position.y = -0.12;
  scene.add(rig);

  /* — Reformer (estrutura creme, estofados verdes) — */
  [[-0.34], [0.34]].forEach(([x]) => {
    const rail = box(0.07, 0.11, 2.5, M.frame);
    rail.position.set(x, 0.36, 0);
    rig.add(rail);
  });
  [[-1.21], [1.21]].forEach(([z]) => {
    const end = box(0.75, 0.11, 0.08, M.frame);
    end.position.set(0, 0.36, z);
    rig.add(end);
  });
  [[-0.34, -1.17], [0.34, -1.17], [-0.34, 1.17], [0.34, 1.17]].forEach(([x, z]) => {
    const leg = box(0.07, 0.36, 0.07, M.frame);
    leg.position.set(x, 0.18, z);
    rig.add(leg);
  });
  const platform = box(0.62, 0.035, 0.34, M.pad);
  platform.position.set(0, 0.435, 1.02);
  rig.add(platform);

  /* Torres com roldanas (cabeceira) */
  [[-0.28], [0.28]].forEach(([x]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 10), M.metal);
    post.position.set(x, 0.65, -1.17);
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20), M.metal);
    pulley.position.set(x, 0.9, -1.17);
    rig.add(post, pulley);
  });

  /* Carrinho (a figura anda junto com ele) */
  const carriage = new THREE.Group();
  const CARRIAGE_Y = 0.465, CARRIAGE_Z = -0.15;
  carriage.position.set(0, CARRIAGE_Y, CARRIAGE_Z);
  carriage.add(box(0.58, 0.09, 0.9, M.pad));
  const headrest = box(0.5, 0.04, 0.26, M.detalhe);
  headrest.position.set(0, 0.075, -0.53);
  headrest.rotation.x = 0.25;
  carriage.add(headrest);
  rig.add(carriage);

  /* Molas */
  class Helix extends THREE.Curve {
    constructor(len, r, turns) { super(); this.len = len; this.r = r; this.turns = turns; }
    getPoint(t) {
      const a = t * this.turns * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * this.r, Math.sin(a) * this.r, -t * this.len);
    }
  }
  const SPRING_LEN = 0.82;
  const springs = new THREE.Group();
  springs.position.set(0, 0.31, 1.16);
  [-0.12, -0.04, 0.04, 0.12].forEach(x => {
    const geo = new THREE.TubeGeometry(new Helix(SPRING_LEN, 0.02, 14), 100, 0.006, 6, false);
    const s = new THREE.Mesh(geo, M.metal);
    s.position.x = x;
    springs.add(s);
  });
  rig.add(springs);

  /* Barra de pés recolhida */
  const footbar = new THREE.Group();
  footbar.position.set(0, 0.41, 0.95);
  [[-0.3], [0.3]].forEach(([x]) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 10), M.metal);
    arm.position.set(x, 0.23, -0.09);
    arm.rotation.x = 0.38;
    footbar.add(arm);
  });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.66, 12), M.pad);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.47, -0.18);
  footbar.add(bar);
  rig.add(footbar);

  /* — A pessoa (figura creme articulada) —
     Origem no quadril, sentada sobre o carrinho. */
  const capsule = (r, len, mat) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat);

  const figura = new THREE.Group();
  figura.position.set(0, 0.12, 0.12); // sobre o carrinho
  carriage.add(figura);

  const pelve = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), M.corpo);
  pelve.scale.set(1.15, 0.8, 1);
  figura.add(pelve);

  /* tronco (gira no quadril) */
  const tronco = new THREE.Group();
  figura.add(tronco);
  const troncoMesh = capsule(0.1, 0.3, M.corpo);
  troncoMesh.position.y = 0.24;
  tronco.add(troncoMesh);
  const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 14), M.corpo);
  cabeca.position.y = 0.56;
  tronco.add(cabeca);
  const coque = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), M.corpo);
  coque.position.set(0, 0.64, -0.06);
  tronco.add(coque);

  /* braços (giram no ombro, esticam à frente no teaser) */
  const bracos = [];
  [[-0.13], [0.13]].forEach(([x]) => {
    const ombro = new THREE.Group();
    ombro.position.set(x, 0.42, 0);
    const braco = capsule(0.032, 0.3, M.corpo);
    braco.position.y = -0.19; // pende do ombro
    ombro.add(braco);
    tronco.add(ombro);
    bracos.push(ombro);
  });

  /* pernas (giram no quadril, unidas e esticadas) */
  const pernas = [];
  [[-0.075], [0.075]].forEach(([x]) => {
    const quadril = new THREE.Group();
    quadril.position.set(x, 0, 0.05);
    const perna = capsule(0.048, 0.44, M.corpo);
    perna.rotation.x = Math.PI / 2;   // estica ao longo do +z (pés ao pé da cama)
    perna.position.z = 0.28;
    quadril.add(perna);
    const pe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.corpo);
    pe.scale.set(0.9, 0.7, 1.3);
    pe.position.z = 0.56;
    quadril.add(pe);
    rig.updateMatrixWorld();
    pernas.push(quadril);
    figura.add(quadril);
  });

  /* alças: linhas creme das mãos até as roldanas */
  const alcaMat = new THREE.LineBasicMaterial({ color: COR_CREME, transparent: true, opacity: 0.7 });
  const alcas = [];
  bracos.forEach((ombro, i) => {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const linha = new THREE.Line(geo, alcaMat);
    rig.add(linha);
    alcas.push({ linha, ombro, pulley: new THREE.Vector3(i === 0 ? -0.28 : 0.28, 0.9, -1.17) });
  });
  const maoLocal = new THREE.Vector3(0, -0.36, 0); // ponta do braço
  function atualizaAlcas() {
    for (const a of alcas) {
      const mao = a.ombro.localToWorld(maoLocal.clone());
      rig.worldToLocal(mao);
      const pos = a.linha.geometry.attributes.position;
      pos.setXYZ(0, mao.x, mao.y, mao.z);
      pos.setXYZ(1, a.pulley.x, a.pulley.y, a.pulley.z);
      pos.needsUpdate = true;
    }
  }

  /* — Pose em função do movimento m (0 = deitada, 1 = teaser) — */
  function pose(m) {
    // tronco: deitado (-90°) → ergue até ~-30°
    tronco.rotation.x = -Math.PI / 2 + m * 1.05;
    // pernas: deitadas (0) → sobem ~52°
    pernas.forEach(q => { q.rotation.x = -m * 0.92; });
    // braços: ao lado do corpo → esticados à frente
    bracos.forEach(o => { o.rotation.x = -0.15 + m * 1.5; });
    // carrinho desliza para longe do pé (molas esticam)
    const glide = -m * 0.28;
    carriage.position.z = CARRIAGE_Z + glide;
    springs.scale.z = (SPRING_LEN - glide) / SPRING_LEN;
    atualizaAlcas();
  }

  function resize() {
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const BASE_ROT = 1.25; // quase de perfil, como na referência

  if (reduceMotion) {
    pose(0.75);
    rig.rotation.y = BASE_ROT;
    renderer.render(scene, camera);
    return;
  }

  /* arrastar para girar */
  let dragRot = 0, dragging = false, lastX = 0;
  host.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    dragRot += (e.clientX - lastX) * 0.006;
    lastX = e.clientX;
  });
  window.addEventListener('pointerup', () => { dragging = false; });

  let visible = false;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(scrubEl);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = clock.getElapsedTime();
    const p = scrubProgress(scrubEl);

    // sobe no meio do percurso, segura, e desce no final
    const m = smoothstep(0.05, 0.45, p) * (1 - smoothstep(0.62, 0.95, p));
    pose(m);

    if (!dragging) dragRot = lerp(dragRot, 0, 0.04);
    rig.rotation.y = BASE_ROT + Math.sin(t * 0.2) * 0.05 + mouseX * 0.08 + dragRot;
    rig.position.y = (isMobile() ? 0.1 : -0.12) + Math.sin(t * 0.55) * 0.015;
    rig.scale.setScalar(isMobile() ? 0.85 : 1);

    renderer.render(scene, camera);
  }
  animate();
})();

/* ──────────────────────────────────────────────────────────────
   3. MIRIAM · PSICOLOGIA — a mente floresce
   Busto creme de cabeça aberta no painel central da Miriam;
   conforme o painel sobe na tela, caules crescem e flores
   desabrocham uma a uma. No peito, um coração verde que acende
   com raiozinhos no final — como na referência enviada.
   ────────────────────────────────────────────────────────────── */
(function miriamFlorescer() {
  if (!window.THREE) return;
  const canvas = document.getElementById('florCanvas');
  if (!canvas) return;
  const THREE = window.THREE;
  const host = canvas.parentElement; // o painel quadrado

  const { scene, renderer } = cenaBase(THREE, canvas);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0.95, 4.1);
  camera.lookAt(0, 0.57, 0);

  const mCorpo = new THREE.MeshStandardMaterial({ color: COR_CREME, roughness: 0.65 });
  const mVerde = new THREE.MeshStandardMaterial({ color: COR_VERDE, roughness: 0.7 });
  const mCoracao = new THREE.MeshStandardMaterial({
    color: COR_VERDE, roughness: 0.5,
    emissive: COR_VERDE, emissiveIntensity: 0.25,
  });

  const rig = new THREE.Group();
  scene.add(rig);

  /* — Busto — */
  const ombros = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), mCorpo);
  ombros.scale.set(1.15, 0.72, 0.7);
  ombros.position.y = -0.12;
  rig.add(ombros);

  const pescoco = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.32, 16), mCorpo);
  pescoco.position.y = 0.34;
  rig.add(pescoco);

  /* cabeça sem a tampa de cima (aberta para as ideias) */
  const TOPO_THETA = 0.34 * Math.PI;
  const cabeca = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 32, 24, 0, Math.PI * 2, TOPO_THETA, Math.PI - TOPO_THETA),
    mCorpo
  );
  cabeca.position.y = 0.85;
  rig.add(cabeca);

  const topoY = 0.85 + 0.36 * Math.cos(TOPO_THETA);   // altura da abertura
  const topoR = 0.36 * Math.sin(TOPO_THETA);           // raio da abertura

  /* borda e interior da abertura */
  const borda = new THREE.Mesh(new THREE.TorusGeometry(topoR, 0.02, 10, 32), mCorpo);
  borda.rotation.x = Math.PI / 2;
  borda.position.y = topoY;
  rig.add(borda);
  const interior = new THREE.Mesh(new THREE.CircleGeometry(topoR - 0.008, 28), mVerde);
  interior.rotation.x = -Math.PI / 2;
  interior.position.y = topoY - 0.005;
  rig.add(interior);

  /* rosto sereno: olhos fechados e sorriso (arcos verdes) */
  [[-0.13], [0.13]].forEach(([x]) => {
    const olho = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 14, Math.PI), mVerde);
    olho.position.set(x, 0.86, 0.335);
    rig.add(olho);
  });
  const sorriso = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 16, Math.PI), mVerde);
  sorriso.rotation.z = Math.PI;
  sorriso.position.set(0, 0.78, 0.34);
  rig.add(sorriso);

  /* — Coração no peito, com raiozinhos que acendem no final — */
  const coracaoShape = new THREE.Shape();
  coracaoShape.moveTo(0, -0.5);
  coracaoShape.bezierCurveTo(-0.55, -0.1, -0.5, 0.42, -0.25, 0.42);
  coracaoShape.bezierCurveTo(-0.05, 0.42, 0, 0.28, 0, 0.2);
  coracaoShape.bezierCurveTo(0, 0.28, 0.05, 0.42, 0.25, 0.42);
  coracaoShape.bezierCurveTo(0.5, 0.42, 0.55, -0.1, 0, -0.5);
  const coracao = new THREE.Mesh(
    new THREE.ExtrudeGeometry(coracaoShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }),
    mCoracao
  );
  coracao.scale.setScalar(0.16);
  coracao.position.set(0, 0.06, 0.38);
  rig.add(coracao);

  const raios = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    const raio = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.07, 6), mVerde);
    raio.position.set(Math.cos(a) * 0.19, 0.06 + Math.sin(a) * 0.19, 0.42);
    raio.rotation.z = a + Math.PI / 2;
    raios.add(raio);
  }
  rig.add(raios);

  /* — Flores que desabrocham do topo da cabeça — */
  const flores = [];
  const NUM_FLORES = 5;
  for (let i = 0; i < NUM_FLORES; i++) {
    const a = (i / NUM_FLORES) * Math.PI * 2 + 0.6;
    const base = new THREE.Vector3(Math.cos(a) * topoR * 0.55, topoY - 0.02, Math.sin(a) * topoR * 0.55);
    // direção: para cima, abrindo para fora
    const dir = new THREE.Vector3(Math.cos(a) * 0.38, 1, Math.sin(a) * 0.38).normalize();
    const alt = 0.42 + (i % 3) * 0.14;

    // caule creme (pivô na base, cresce por escala)
    const caule = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 1, 8), mCorpo);
    caule.geometry.translate(0, 0.5, 0);
    caule.position.copy(base);
    caule.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    rig.add(caule);

    // corola: miolo verde + pétalas creme
    const flor = new THREE.Group();
    const miolo = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), mVerde);
    flor.add(miolo);
    for (let pIdx = 0; pIdx < 6; pIdx++) {
      const pa = (pIdx / 6) * Math.PI * 2;
      const petala = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mCorpo);
      petala.scale.set(1.5, 0.45, 0.8);
      petala.position.set(Math.cos(pa) * 0.085, 0, Math.sin(pa) * 0.085);
      petala.rotation.y = -pa;
      flor.add(petala);
    }
    flor.quaternion.copy(caule.quaternion);
    rig.add(flor);

    flores.push({ caule, flor, base, dir, alt, atraso: i * 0.13 });
  }

  /* pétalas soltas flutuando (aparecem no final, como na referência) */
  const soltas = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: COR_CREME, transparent: true, opacity: 0 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), mat);
    s.scale.set(1.6, 0.5, 0.8);
    s.userData.a = (i / 6) * Math.PI * 2;
    s.userData.r = 0.55 + (i % 3) * 0.16;
    soltas.push(s);
    rig.add(s);
  }

  /* — Florescer em função do progresso p — */
  function florescer(p, t) {
    for (const f of flores) {
      const ini = 0.08 + f.atraso;
      const cresce = smoothstep(ini, ini + 0.26, p);
      const abre = smoothstep(ini + 0.18, ini + 0.4, p);

      f.caule.scale.set(Math.min(1, cresce * 2), cresce * f.alt, Math.min(1, cresce * 2));
      const ponta = f.base.clone().addScaledVector(f.dir, cresce * f.alt);
      f.flor.position.copy(ponta);
      const pop = abre * (1 + 0.22 * Math.sin(abre * Math.PI)); // desabrocha com "pulinho"
      f.flor.scale.setScalar(Math.max(0.001, pop));
      f.flor.rotation.y = t * 0.25 + f.atraso * 8; // giro bem sutil
    }

    // coração pulsa devagar; raios acendem no final
    const fim = smoothstep(0.7, 0.95, p);
    coracao.scale.setScalar(0.16 * (1 + 0.06 * Math.sin(t * 2.4)));
    mCoracao.emissiveIntensity = 0.25 + fim * 0.35;
    raios.children.forEach((r, i) => {
      r.scale.setScalar(Math.max(0.001, smoothstep(0.72 + i * 0.02, 0.9 + i * 0.02, p)));
    });

    // pétalas soltas dançando ao redor, só depois que floresceu
    soltas.forEach((s, i) => {
      s.material.opacity = fim * 0.7;
      s.position.set(
        Math.cos(s.userData.a + t * 0.3) * s.userData.r,
        topoY + 0.3 + Math.sin(t * 0.6 + i) * 0.12,
        Math.sin(s.userData.a + t * 0.3) * s.userData.r * 0.6
      );
      s.rotation.z = t * 0.8 + i;
    });
  }

  function resize() {
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  if (reduceMotion) {
    florescer(1, 2);
    renderer.render(scene, camera);
    return;
  }

  let visible = false;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(host);

  /* Progresso do florescer: 0 quando o painel entra pela base da
     tela, 1 quando ele chega perto do centro — rolar rega a flor. */
  function progressoFlor() {
    const rect = host.getBoundingClientRect();
    const vh = window.innerHeight;
    return clamp((vh * 0.95 - rect.top) / (vh * 0.72), 0, 1);
  }

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = clock.getElapsedTime();

    florescer(progressoFlor(), t);

    rig.rotation.y = Math.sin(t * 0.3) * 0.1 + mouseX * 0.1;
    rig.position.y = Math.sin(t * 0.5) * 0.02;
    rig.scale.setScalar(1);

    renderer.render(scene, camera);
  }
  animate();
})();
