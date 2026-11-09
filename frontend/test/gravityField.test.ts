import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clamp01,
  computeFieldStage,
  smoothstep,
  sphereCountFor,
  sphereRadius,
} from '../src/lib/gravityFieldMath.ts';

test('smoothstep clamps outside its edges', () => {
  assert.equal(smoothstep(0, 1, -2), 0);
  assert.equal(smoothstep(0, 1, 2), 1);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(2), 1);
});

test('the hero cluster is the only active state at the top', () => {
  const stage = computeFieldStage(0);
  assert.equal(stage.hero, 1);
  assert.equal(stage.spread, 0);
  assert.equal(stage.descent, 0);
  assert.equal(stage.ring, 0);
  assert.equal(stage.halo, 0);
});

test('the descent peaks in the middle and clears before the ring takes over', () => {
  assert.ok(computeFieldStage(0.4).descent > computeFieldStage(0.28).descent);
  assert.ok(computeFieldStage(0.4).descent > computeFieldStage(0.5).descent);
  assert.ok(computeFieldStage(0.4).ring < 0.2);
  assert.ok(computeFieldStage(0.6).ring > 0.5);
});

test('the orbit ring holds to the footer while the halo expands', () => {
  const mid = computeFieldStage(0.7);
  const end = computeFieldStage(1);
  assert.equal(mid.ring, 1);
  assert.equal(end.ring, 1);
  assert.ok(end.halo > mid.halo);
  assert.equal(end.hero, 0);
});

test('sphere budget scales down on small screens', () => {
  assert.equal(sphereCountFor(390), 34);
  assert.equal(sphereCountFor(800), 54);
  assert.equal(sphereCountFor(1440), 78);
});

test('radius distribution keeps three deliberate size bands', () => {
  const small = sphereRadius(0.1, 0);
  const medium = sphereRadius(0.5, 0);
  const large = sphereRadius(0.9, 0);

  assert.ok(small >= 0.3 && small <= 0.44);
  assert.ok(medium >= 0.48 && medium <= 0.68);
  assert.ok(large >= 0.74 && large <= 1.02);
  assert.ok(small < medium && medium < large);
});
