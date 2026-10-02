// Small, repeated koi form loose schools. Their bodies stay upright and their
// headings never rotate; only the renderer's tail mesh bends as phase advances.
const WIDTH = 1672;
const TAU = Math.PI * 2;
const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;

// Seeded placement keeps replay stable while avoiding a visible grid.
function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seededRandom(291008);
const COHORTS = [
  [545, 538, 35], [910, 554, 41], [1275, 550, 38],
  [675, 644, 39], [1015, 660, 34], [1390, 650, 43],
  [760, 765, 36], [1080, 789, 40], [1420, 780, 37],
];
const VARIANTS = [
  { sprite: 'redKoi', length: 230 / 6 },
  { sprite: 'darkKoi', length: 207 / 6 },
  { sprite: 'orangeKoi', length: 32 },
  { sprite: 'goldKoi', length: 29 },
];
const CONFIG = [];
for (let cohort = 0; cohort < COHORTS.length; cohort++) {
  const [cx, cy, speed] = COHORTS[cohort];
  const placed = [];
  for (let member = 0; member < 8; member++) {
    const i = CONFIG.length;
    let point;
    for (let attempt = 0; attempt < 160; attempt++) {
      const theta = random() * TAU;
      const radius = Math.sqrt(random());
      point = [cx + Math.cos(theta) * radius * 132, cy + Math.sin(theta) * radius * 40];
      if (placed.every(([x, y]) => Math.hypot(point[0] - x, point[1] - y) > 34)) break;
    }
    placed.push(point);
    const variant = VARIANTS[i < 2 ? i : Math.floor(random() * VARIANTS.length)];
    const depth = .30 + random() * .60;
    CONFIG.push({
      id: i === 0 ? 'koi-red' : i === 1 ? 'koi-dark' : `school-${String(i).padStart(2, '0')}`,
      kind: 'fish', sprite: variant.sprite,
      x: point[0], y: point[1], size: variant.length * (.77 + depth * .27), depth,
      speed: speed * (.97 + random() * .06), direction: 1,
      angle: 0,
      waveAmplitude: 20 + (i % 5) * 3,
      wavelength: 370 + (cohort % 3) * 65,
      waveOffset: cohort * .65 + member * .14,
      frequency: 1.5 + random() * .6, phaseOffset: random() * TAU,
    });
  }
}

export function createMotion() {
  const creatures = [];
  let clock = 0;
  function update(dt, t) {
    clock = Number.isFinite(t) ? Math.max(0, t) : clock + Math.max(0, Number.isFinite(dt) ? dt : 0);
    creatures.forEach((creature, i) => {
      const config = CONFIG[i];
      if (config.kind === 'fish') {
        const margin = config.size + 45;
        // A whole fish exits before wrapping; no pop or turn inside the pond.
        creature.x = modulo(config.x + margin + clock * config.speed * config.direction, WIDTH + margin * 2) - margin;
        // A shared wavelength within each school keeps a loose travelling wave.
        // Use unwrapped distance so crossing the edge never resets its phase.
        const distance = config.x + clock * config.speed;
        creature.y = config.y + Math.sin(distance / config.wavelength * TAU + config.waveOffset) * config.waveAmplitude;
      } else {
        // Fixed hover point. Only the four existing wings deform in the renderer.
        creature.x = config.x;
        creature.y = config.y;
      }
      // All headings stay fixed; no body spins or upside-down turns.
      creature.angle = config.angle;
      creature.phase = modulo(clock * TAU * config.frequency + config.phaseOffset, TAU);
      creature.turn = 0;
    });
    return creatures;
  }
  function reset() {
    clock = 0;
    creatures.length = 0;
    CONFIG.forEach(config => creatures.push({ ...config, phase: config.phaseOffset, turn: 0 }));
    return update(0, 0);
  }
  reset();
  return { creatures, update, reset };
}
