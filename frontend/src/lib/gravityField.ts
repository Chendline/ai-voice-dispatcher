import * as THREE from 'three';
import {
  clamp01,
  computeFieldStage,
  sphereCountFor,
  sphereRadius,
  type FieldStage,
} from './gravityFieldMath';

export interface GravityFieldHandle {
  destroy(): void;
}

export interface GravityFieldOptions {
  reducedMotion: boolean;
}

type SphereRole = 'cream' | 'sage' | 'olive' | 'caramel' | 'copper' | 'forest';

interface FieldSphere {
  id: number;
  radius: number;
  mass: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Unit-sized home offset inside the hero cluster. */
  home: THREE.Vector3;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>;
  ringU: number;
  ringV: number;
  phase: number;
}

interface Bounds {
  width: number;
  height: number;
  aspect: number;
}

const FIXED_STEP = 1 / 60;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const ROLE_TABLE: SphereRole[] = [
  'cream',
  'caramel',
  'olive',
  'sage',
  'caramel',
  'olive',
  'cream',
  'copper',
  'sage',
  'caramel',
  'forest',
  'olive',
];

const MATERIAL_SPECS: Record<
  SphereRole,
  { color: string; roughness: number; clearcoat: number; emissive: number }
> = {
  cream: { color: '#fefae0', roughness: 0.32, clearcoat: 0.55, emissive: 0.06 },
  sage: { color: '#8b9c52', roughness: 0.38, clearcoat: 0.4, emissive: 0.05 },
  olive: { color: '#606c38', roughness: 0.42, clearcoat: 0.34, emissive: 0.04 },
  caramel: { color: '#dda15e', roughness: 0.3, clearcoat: 0.5, emissive: 0.07 },
  copper: { color: '#bc6c25', roughness: 0.34, clearcoat: 0.42, emissive: 0.05 },
  forest: { color: '#283618', roughness: 0.46, clearcoat: 0.26, emissive: 0.02 },
};

/** Small deterministic PRNG so the cluster composition is intentional. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createEnvironmentTexture(): THREE.Texture | null {  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#fffdf6');
  sky.addColorStop(0.46, '#f6ecd6');
  sky.addColorStop(0.72, '#c9bb92');
  sky.addColorStop(1, '#5c6638');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);

  const sun = ctx.createRadialGradient(146, 66, 0, 146, 66, 128);
  sun.addColorStop(0, 'rgba(255, 255, 250, 0.98)');
  sun.addColorStop(0.35, 'rgba(255, 241, 205, 0.55)');
  sun.addColorStop(1, 'rgba(255, 241, 205, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 512, 256);

  const warm = ctx.createRadialGradient(388, 96, 0, 388, 96, 150);
  warm.addColorStop(0, 'rgba(221, 161, 94, 0.6)');
  warm.addColorStop(0.5, 'rgba(188, 108, 37, 0.22)');
  warm.addColorStop(1, 'rgba(188, 108, 37, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, 512, 256);

  const olive = ctx.createRadialGradient(60, 232, 0, 60, 232, 190);
  olive.addColorStop(0, 'rgba(96, 108, 56, 0.55)');
  olive.addColorStop(1, 'rgba(96, 108, 56, 0)');
  ctx.fillStyle = olive;
  ctx.fillRect(0, 0, 512, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createGravityField(
  container: HTMLElement,
  options: GravityFieldOptions,
): GravityFieldHandle | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'aegis-field-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch {
    canvas.remove();
    return null;
  }

  const initialWidth = container.clientWidth || window.innerWidth || 1;
  const initialHeight = container.clientHeight || window.innerHeight || 1;
  const isMobile = initialWidth < 720;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.8 : 2));
  renderer.setSize(initialWidth, initialHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, initialWidth / initialHeight, 0.1, 100);
  camera.position.set(0, 0, 11);

  const halfHeightAtOrigin = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  const bounds: Bounds = {
    height: halfHeightAtOrigin() * 2,
    width: halfHeightAtOrigin() * 2 * camera.aspect,
    aspect: camera.aspect,
  };

  /* ---------------------------------------------------------------------
     Lighting + reflections
  --------------------------------------------------------------------- */

  const hemisphere = new THREE.HemisphereLight(0xfff6e2, 0x606c38, 1.2);
  scene.add(hemisphere);

  const keyLight = new THREE.DirectionalLight(0xfff2d8, 2.3);
  keyLight.position.set(-6, 9, 7);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xdda15e, 1.65);
  rimLight.position.set(7, 4, -7);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.42);
  fillLight.position.set(0, -4, 8);
  scene.add(fillLight);

  let envTarget: THREE.WebGLRenderTarget | null = null;
  const envSource = createEnvironmentTexture();
  if (envSource) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTarget = pmrem.fromEquirectangular(envSource);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.72;
    envSource.dispose();
    pmrem.dispose();
  }

  /* ---------------------------------------------------------------------
     Shared geometry + materials
  --------------------------------------------------------------------- */

  const geometry = new THREE.SphereGeometry(1, isMobile ? 28 : 44, isMobile ? 28 : 44);
  const materials: THREE.MeshPhysicalMaterial[] = [];
  const roleMaterials = new Map<SphereRole, THREE.MeshPhysicalMaterial>();

  for (const role of Object.keys(MATERIAL_SPECS) as SphereRole[]) {
    const spec = MATERIAL_SPECS[role];
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(spec.color),
      roughness: spec.roughness,
      metalness: 0,
      clearcoat: spec.clearcoat,
      clearcoatRoughness: 0.26,
      emissive: new THREE.Color(spec.color),
      emissiveIntensity: spec.emissive,
      envMapIntensity: 1.15,
    });
    roleMaterials.set(role, material);
    materials.push(material);
  }

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f7ead0'),
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    transmission: 0.92,
    ior: 1.46,
    thickness: 2.3,
    specularIntensity: 1,
    specularColor: new THREE.Color('#ffffff'),
    attenuationColor: new THREE.Color('#dda15e'),
    attenuationDistance: 2.6,
    emissive: new THREE.Color('#dda15e'),
    emissiveIntensity: 0.05,
    transparent: true,
    envMapIntensity: 1.35,
  });
  materials.push(glassMaterial);

  /* ---------------------------------------------------------------------
     Sphere construction
  --------------------------------------------------------------------- */

  const count = sphereCountFor(initialWidth);
  const sizeFactor = THREE.MathUtils.clamp(
    Math.min(bounds.width / 6.6, bounds.height / 7.6),
    0.5,
    1,
  );
  const clusterRadius = Math.min(bounds.width * 0.3, bounds.height * 0.33);
  const heroCenterX = initialWidth >= 900 ? bounds.width * 0.16 : 0;

  const spheres: FieldSphere[] = [];
  const farScatter = Math.max(bounds.width, bounds.height) * 1.05;
  const random = mulberry32(0x0a3615);

  for (let i = 0; i < count; i += 1) {
    const tier = random();
    const radius = sphereRadius(tier, random()) * sizeFactor;
    const mass = Math.max(0.02, radius * radius * radius);

    const isGlass = random() < 0.17;
    const role = ROLE_TABLE[i % ROLE_TABLE.length];
    const material = isGlass ? glassMaterial : roleMaterials.get(role) ?? roleMaterials.get('olive')!;

    // Evenly distributed home offsets keep the cluster intentional-looking
    // instead of collapsing into one clump.
    const homeY = 1 - (i / Math.max(1, count - 1)) * 2;
    const homeRing = Math.sqrt(Math.max(0, 1 - homeY * homeY));
    const homeTheta = i * GOLDEN_ANGLE;
    const home = new THREE.Vector3(
      Math.cos(homeTheta) * homeRing,
      homeY,
      Math.sin(homeTheta) * homeRing * 0.86,
    ).multiplyScalar(0.55 + random() * 0.45);

    const angle = random() * Math.PI * 2;
    const position = new THREE.Vector3(
      Math.cos(angle) * farScatter,
      Math.sin(angle) * farScatter * 0.72,
      (random() - 0.5) * 4,
    );
    const velocity = position
      .clone()
      .normalize()
      .multiplyScalar(-(0.06 + random() * 0.05));

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.scale.setScalar(radius);
    scene.add(mesh);

    spheres.push({
      id: i,
      radius,
      mass,
      position,
      velocity,
      home,
      mesh,
      ringU: i * GOLDEN_ANGLE,
      ringV: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
    });
  }

  /* ---------------------------------------------------------------------
     Pointer state
  --------------------------------------------------------------------- */

  const pointerNdc = new THREE.Vector2(0, 0);
  const pointerWorld = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const pointer = {
    active: false,
    hasPrev: false,
    down: false,
    speed: 0,
  };

  const updatePointerWorld = () => {
    if (!pointer.active) {
      pointer.speed *= 0.85;
      return;
    }
    projected.set(pointerNdc.x, pointerNdc.y, 0.5).unproject(camera);
    projected.sub(camera.position).normalize();
    const distance = -camera.position.z / projected.z;
    projected.multiplyScalar(distance).add(camera.position);

    const targetSpeed = pointer.hasPrev
      ? Math.min(projected.distanceTo(pointerWorld) / FIXED_STEP, 1.15)
      : 0;
    pointerWorld.copy(projected);
    pointer.hasPrev = true;
    pointer.speed += (targetSpeed - pointer.speed) * 0.28;
  };

  const handlePointerMove = (event: PointerEvent) => {
    pointerNdc.set(
      (event.clientX / (window.innerWidth || 1)) * 2 - 1,
      -(event.clientY / (window.innerHeight || 1)) * 2 + 1,
    );
    pointer.active = true;
  };

  const handlePointerDown = (event: PointerEvent) => {
    pointer.down = true;
    if (event.pointerType === 'touch') pointer.active = true;
  };
  const handlePointerUp = (event: PointerEvent) => {
    pointer.down = false;
    if (event.pointerType === 'touch') {
      pointer.active = false;
      pointer.hasPrev = false;
    }
  };
  const handlePointerLeave = () => {
    pointer.active = false;
    pointer.hasPrev = false;
    pointer.down = false;
  };

  /* ---------------------------------------------------------------------
     Simulation
  --------------------------------------------------------------------- */

  const diff = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const relative = new THREE.Vector3();

  const simulate = (stage: FieldStage, elapsed: number, pointerActive: boolean) => {
    const spreadScale = 1 + stage.spread * 0.95;
    const homeScale = clusterRadius * spreadScale;
    const homeStrength = (0.0014 + 0.0034 * stage.hero) * (1 + 6.5 * introFactor);
    const centerX = heroCenterX * stage.hero;
    const damping = 0.906 + 0.052 * stage.ring - 0.008 * stage.descent;
    const repelRadius = Math.max(2.1, Math.min(4.1, bounds.height * 0.46));
    const repelForce = pointer.down ? 0.078 : 0.05;
    const repelBoost = 1 + pointer.speed * 2.7;
    const ringMajorBase = Math.min(bounds.width * 0.285, bounds.height * 0.27);
    const ringMajor = ringMajorBase * (1 + stage.halo * 0.52);
    const ringTube = ringMajor * 0.22;

    for (const sphere of spheres) {
      const { position, velocity, radius } = sphere;

      // Ambient floating. Reads as weightless in the hero and calmer later.
      const ambient = 0.3 + 0.7 * stage.hero;
      velocity.x += Math.sin(elapsed * 0.42 + sphere.phase) * 0.00055 * radius * ambient;
      velocity.y += Math.cos(elapsed * 0.51 + sphere.phase * 1.3) * 0.00055 * radius * ambient;
      velocity.z += Math.sin(elapsed * 0.36 + sphere.phase * 0.7) * 0.00022;

      // Home cluster (hero) + slow rotation around the cluster centre.
      velocity.x += (centerX + sphere.home.x * homeScale - position.x) * homeStrength;
      velocity.y += (sphere.home.y * homeScale * 0.94 - position.y) * homeStrength;
      velocity.z += (sphere.home.z * homeScale * 0.82 - position.z) * homeStrength;
      if (stage.hero > 0.001) {
        velocity.x += -sphere.home.y * 0.0012 * stage.hero;
        velocity.y += sphere.home.x * 0.0012 * stage.hero;
      }

      // Descent: real gravity, then the walls catch the fall.
      if (stage.descent > 0.001) {
        velocity.y -= 0.013 * stage.descent;
      }

      // Orbit ring: a tilted AEGIS orbit built from a torus surface.
      if (stage.ring > 0.001) {
        const angle = elapsed * 0.17 + sphere.ringU;
        const ringRadius = ringMajor + ringTube * Math.cos(sphere.ringV);
        const targetX = Math.cos(angle) * ringRadius * 1.5;
        const targetY = Math.sin(angle) * ringRadius * 0.82;
        const targetZ = Math.sin(sphere.ringV) * ringTube * 1.6 + Math.sin(angle * 2) * 0.18;
        const pull = 0.019 * stage.ring;
        velocity.x += (targetX - position.x) * pull;
        velocity.y += (targetY - position.y) * pull;
        velocity.z += (targetZ - position.z) * pull;
      }

      // Cursor repulsion with momentum from cursor speed.
      if (pointerActive) {
        diff.subVectors(position, pointerWorld);
        const distance = diff.length();
        if (distance < repelRadius && distance > 0.0001) {
          const ratio = distance / repelRadius;
          const falloff = 1 - ratio * ratio * (3 - 2 * ratio);
          const push = falloff * repelForce * repelBoost;
          normal.copy(diff).multiplyScalar(1 / distance);
          normal.z *= 0.12;
          if (normal.lengthSq() > 0.000001) normal.normalize();
          velocity.addScaledVector(normal, push);
        }
      }

      const speedSq = velocity.lengthSq();
      if (speedSq > 9) velocity.multiplyScalar(3 / Math.sqrt(speedSq));

      velocity.multiplyScalar(damping);
      position.add(velocity);
    }

    // Pairwise collisions, twice per step for stable stacking.
    const bounciness = 0.04 + 0.28 * stage.descent;
    for (let step = 0; step < 2; step += 1) {
      for (let i = 0; i < spheres.length; i += 1) {
        const first = spheres[i];
        for (let j = i + 1; j < spheres.length; j += 1) {
          const second = spheres[j];
          diff.subVectors(second.position, first.position);
          const distance = diff.length();
          const minDistance = first.radius + second.radius;
          if (distance >= minDistance || distance <= 0.0001) continue;

          const overlap = minDistance - distance;
          diff.multiplyScalar(1 / distance);
          const totalMass = first.mass + second.mass;
          const shareFirst = second.mass / totalMass;
          const shareSecond = first.mass / totalMass;

          first.position.addScaledVector(diff, -overlap * shareFirst * 0.52);
          second.position.addScaledVector(diff, overlap * shareSecond * 0.52);

          relative.subVectors(second.velocity, first.velocity);
          const alongNormal = relative.dot(diff);
          if (alongNormal < -0.0001) {
            const impulse =
              (-(1 + bounciness) * alongNormal) / (1 / first.mass + 1 / second.mass);
            first.velocity.addScaledVector(diff, -impulse / first.mass);
            second.velocity.addScaledVector(diff, impulse / second.mass);
          }
        }
      }
    }

    // Bounds: walls, ceiling and a bouncy floor.
    const pad = 0.16;
    const xBound = bounds.width / 2;
    const topY = bounds.height / 2;
    const floorY = -bounds.height / 2;
    const zBound = 2.1;
    const restitution = 0.34 + 0.3 * stage.descent;

    for (const sphere of spheres) {
      const { position, velocity, radius } = sphere;
      const r = radius * (1 + stage.halo * 0.05);

      if (position.x - r < -xBound + pad) {
        position.x = -xBound + pad + r;
        velocity.x *= -0.34;
      } else if (position.x + r > xBound - pad) {
        position.x = xBound - pad - r;
        velocity.x *= -0.34;
      }

      if (position.y - r < floorY + pad) {
        position.y = floorY + pad + r;
        if (velocity.y < 0) velocity.y = -velocity.y * restitution;
        if (stage.descent > 0.18) {
          velocity.x *= 0.9;
          velocity.z *= 0.88;
        }
      } else if (position.y + r > topY - pad) {
        position.y = topY - pad - r;
        if (velocity.y > 0) velocity.y *= -0.3;
      }

      if (position.z - r < -zBound) {
        position.z = -zBound + r;
        velocity.z *= -0.3;
      } else if (position.z + r > zBound) {
        position.z = zBound - r;
        velocity.z *= -0.3;
      }

      const visualRadius = r * (1 + Math.sin(elapsed * 0.7 + sphere.phase) * 0.012);
      sphere.mesh.position.copy(position);
      sphere.mesh.scale.setScalar(visualRadius);
    }
  };

  /* ---------------------------------------------------------------------
     Frame loop
  --------------------------------------------------------------------- */

  let elapsed = 0;
  let introFactor = 1;
  let accumulator = 0;
  let rafId = 0;
  let running = false;

  const readProgress = () => {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return clamp01(window.scrollY / scrollable);
  };

  const renderFrame = () => {
    renderer.render(scene, camera);
  };

  const tick = (now: number) => {
    if (!running) return;
    rafId = requestAnimationFrame(tick);

    const delta = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    elapsed += delta;
    introFactor = 1 - (1 - Math.min(1, elapsed / 2.6)) ** 3;

    updatePointerWorld();

    accumulator = Math.min(accumulator + delta, 0.1);
    const stage = computeFieldStage(readProgress());
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 4) {
      simulate(stage, elapsed, pointer.active);
      accumulator -= FIXED_STEP;
      steps += 1;
    }

    renderFrame();
  };

  let lastFrame = performance.now();

  const start = () => {
    if (running || options.reducedMotion) return;
    running = true;
    lastFrame = performance.now();
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  };

  /* ---------------------------------------------------------------------
     Reduced motion: settle the scene, then draw a single honest frame.
  --------------------------------------------------------------------- */

  if (options.reducedMotion) {
    introFactor = 0;
    const stage = computeFieldStage(readProgress());
    for (let i = 0; i < 180; i += 1) {
      simulate(stage, i * FIXED_STEP, false);
    }
  } else {
    start();
  }

  /* ---------------------------------------------------------------------
     Resize, visibility and pointer listeners
  --------------------------------------------------------------------- */

  const handleResize = () => {
    const width = container.clientWidth || window.innerWidth || 1;
    const height = container.clientHeight || window.innerHeight || 1;
    if (width <= 0 || height <= 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 720 ? 1.8 : 2));
    renderer.setSize(width, height, false);

    bounds.height = halfHeightAtOrigin() * 2;
    bounds.width = bounds.height * camera.aspect;
    bounds.aspect = camera.aspect;

    if (options.reducedMotion) {
      const stage = computeFieldStage(readProgress());
      for (let i = 0; i < 60; i += 1) {
        simulate(stage, (180 + i) * FIXED_STEP, false);
      }
      renderFrame();
    }
  };

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  const handleVisibility = () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  window.addEventListener('pointercancel', handlePointerUp, { passive: true });
  window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  document.addEventListener('visibilitychange', handleVisibility);

  if (options.reducedMotion) {
    handleResize();
    renderFrame();
  }

  /* ---------------------------------------------------------------------
     Teardown
  --------------------------------------------------------------------- */

  return {
    destroy() {
      stop();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibility);

      for (const sphere of spheres) {
        scene.remove(sphere.mesh);
      }
      geometry.dispose();
      for (const material of materials) material.dispose();
      envTarget?.dispose();
      scene.environment = null;
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
