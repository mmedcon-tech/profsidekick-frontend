#!/usr/bin/env node
/**
 * Optimize avatar GLB assets for fast loading.
 *
 * Applies meshopt geometry compression (EXT_meshopt_compression),
 * vertex quantization (KHR_mesh_quantization) and WebP texture
 * compression (EXT_texture_webp). All three are decoded natively by
 * three.js / @react-three/drei (drei auto-registers MeshoptDecoder), so
 * no extra loader configuration is required at runtime.
 *
 * Morph targets (ARKit visemes used for lip-sync) are preserved — we run
 * with `--no-simplify` so the facial mesh keeps full fidelity. Typical
 * result: ~12 MB -> ~2.6 MB (≈78% smaller), which is what turns a ~20s
 * first paint into a sub-second one.
 *
 * Originals are backed up to public/avatars/.originals/ before overwrite.
 *
 * Usage:
 *   node scripts/optimize-avatars.mjs           # optimize avatars > THRESHOLD
 *   node scripts/optimize-avatars.mjs --force    # re-optimize even if small
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVATAR_DIR = join(__dirname, '..', 'public', 'avatars');
const BACKUP_DIR = join(AVATAR_DIR, '.originals');
const THRESHOLD_BYTES = 1_500_000; // skip assets already small enough
const force = process.argv.includes('--force');

const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

function optimize(file) {
  const src = join(AVATAR_DIR, file);
  const before = statSync(src).size;
  if (!force && before < THRESHOLD_BYTES) {
    console.log(`• skip   ${file} (${mb(before)}, already small)`);
    return;
  }

  mkdirSync(BACKUP_DIR, { recursive: true });
  const backup = join(BACKUP_DIR, file);
  if (!existsSync(backup)) copyFileSync(src, backup);

  // gltf-transform optimize, sourcing the pristine backup so the script is
  // idempotent (re-running never compounds compression artifacts).
  execFileSync(
    'npx',
    [
      '--yes',
      '@gltf-transform/cli@4',
      'optimize',
      backup,
      src,
      '--no-simplify',
      '--compress',
      'meshopt',
      '--texture-compress',
      'webp',
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );

  const after = statSync(src).size;
  console.log(`✓ done   ${file}: ${mb(before)} -> ${mb(after)}`);
}

const files = readdirSync(AVATAR_DIR).filter((f) => f.toLowerCase().endsWith('.glb'));
if (files.length === 0) {
  console.error('No .glb files found in', AVATAR_DIR);
  process.exit(1);
}
console.log(`Optimizing avatars in ${AVATAR_DIR}\n`);
for (const f of files) optimize(f);
console.log('\nDone. Originals backed up in', BACKUP_DIR);
