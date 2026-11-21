// Domain model readability: no two entity boxes of AWSBedrockImplementation may overlap, and no entity may sit on the default (0,0) spot.
// Box size is estimated like Studio Pro draws it: 200 wide, 28 + 14 per attribute high (+ margin). Run: node --test tests/domain-layout.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const mpr = path.join(__dirname, '..', 'GenAIShowcaseStarterApp.mpr');
const mx = (cmd) => execFileSync('mxcli', ['-p', mpr, '-c', cmd], { encoding: 'utf8', maxBuffer: 1 << 26 });

test('entities of AWSBedrockImplementation do not overlap', () => {
  const list = mx('SHOW ENTITIES IN AWSBedrockImplementation');
  const attrs = {};
  for (const m of list.matchAll(/^\|\s*AWSBedrockImplementation\.(\w+)\s*\|[^|]*\|[^|]*\|\s*(\d+)\s*\|/gm)) attrs[m[1]] = Number(m[2]);
  const names = Object.keys(attrs);
  assert.ok(names.length > 30, 'expected the entities of the module');
  const out = mx(names.map((n) => `DESCRIBE ENTITY AWSBedrockImplementation.${n}`).join('; '));
  const boxes = [];
  const re = /@Position\((-?\d+),\s*(-?\d+)\)\s*\n[^\n]*?entity AWSBedrockImplementation\.(\w+)/g;
  for (const m of out.matchAll(re)) {
    const [x, y, name] = [Number(m[1]), Number(m[2]), m[3]];
    boxes.push({ name, x, y, w: 200, h: 28 + 14 * (attrs[name] || 0) + 10 });
  }
  assert.equal(boxes.length, names.length, 'every entity has a position');
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push(`${a.name} / ${b.name}`);
  }
  assert.deepEqual(overlaps, [], 'overlapping entities: ' + overlaps.join(', '));
});
