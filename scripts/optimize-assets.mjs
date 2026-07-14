/**
 * Asset Optimization Script
 *
 * Converts source PNGs/JPGs in public/assets/ to WebP and optionally
 * resized variants in public/assets-optimized/.
 *
 * SOURCE ORIGINALS ARE NEVER MODIFIED. All output goes to a separate folder.
 *
 * Usage:
 *   node scripts/optimize-assets.mjs             # dry run (shows what would be done)
 *   node scripts/optimize-assets.mjs --run        # actually process assets
 *   node scripts/optimize-assets.mjs --run --only=backgrounds
 *   node scripts/optimize-assets.mjs --run --only=dice
 *
 * Output structure mirrors the source:
 *   public/assets/bg/jungle_gate_home.jpg
 *   → public/assets-optimized/bg/jungle_gate_home.webp
 */

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const SRC_ROOT = join(__dirname, '..', 'public', 'assets');
const OUT_ROOT = join(__dirname, '..', 'public', 'assets-optimized');

const args    = process.argv.slice(2);
const DRY_RUN = !args.includes('--run');
const ONLY    = (args.find((a) => a.startsWith('--only=')) ?? '').replace('--only=', '') || null;

// ── Quality/resize presets ───────────────────────────────────────────────────

/**
 * @typedef {{ quality: number; width?: number; height?: number; fit?: 'inside'|'cover'|'fill'; keepPng?: boolean }} Preset
 */

/** @type {Record<string, Preset>} */
const PRESETS = {
  // Full-screen background images — mobile portrait target
  backgrounds: {
    quality: 87,
    width:   720,
    height:  1280,
    fit:     'cover',
  },
  // Buttons and icon assets — crisp at native resolution
  buttons: {
    quality: 92,
  },
  // Global icons
  icons: {
    quality: 90,
  },
  // UI chrome frames / overlays
  ui: {
    quality: 91,
    keepPng: true,  // fallback PNG kept alongside WebP (transparency check)
  },
  // Prop sprites (skulls, torches, etc.)
  props: {
    quality: 93,
    keepPng: true,
  },
  // Badge images
  badges: {
    quality: 92,
    keepPng: true,
  },
  // Dice face images — small, crisp
  dice: {
    quality: 94,
    width:   192,
    height:  192,
    fit:     'inside',
    keepPng: true,
  },
  // Glyph tiles — high fidelity, keep PNG fallback for transparency
  'glyph-tiles': {
    quality: 95,
    keepPng: true,
  },
  // Torch-trial scene layers
  'skull-gate': {
    quality: 92,
    keepPng: true,
  },
};

// ── Source → preset mapping ──────────────────────────────────────────────────
// Maps a relative path prefix (from SRC_ROOT) to a preset key.

/** @type {Array<[string, string]>} */
const PATH_PRESETS = [
  ['bg/',                                          'backgrounds'],
  ['buttons/',                                     'buttons'],
  ['icons/',                                       'icons'],
  ['ui/',                                          'ui'],
  ['props/',                                       'props'],
  ['badges/',                                      'badges'],
  ['games/dice-of-faith/dice/',                    'dice'],
  ['games/glyph-gate/tiles/',                      'glyph-tiles'],
  ['games/skull-gate/',                            'skull-gate'],
  // Legacy dice location
  ['games/dice_face',                              'dice'],
];

/** @param {string} relPath relative to SRC_ROOT */
function getPreset(relPath) {
  for (const [prefix, preset] of PATH_PRESETS) {
    if (relPath.startsWith(prefix) || relPath.includes(prefix.replace('/', ''))) {
      return { key: preset, ...PRESETS[preset] };
    }
  }
  // Default
  return { key: 'default', quality: 88, keepPng: false };
}

// ── File discovery ────────────────────────────────────────────────────────────

const SUPPORTED = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (SUPPORTED.has(extname(entry).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Check sharp availability
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('\n  sharp is not installed.\n');
    console.error('  Install it with:\n');
    console.error('    npm install --save-dev sharp\n');
    console.error('  Then re-run this script.\n');
    process.exit(1);
  }

  const allFiles = walk(SRC_ROOT);
  const files    = ONLY
    ? allFiles.filter((f) => getPreset(relative(SRC_ROOT, f)).key === ONLY || relative(SRC_ROOT, f).startsWith(ONLY))
    : allFiles;

  console.log(`\n  Asset optimization — ${DRY_RUN ? 'DRY RUN (pass --run to process)' : 'RUNNING'}`);
  console.log(`  Source:  ${SRC_ROOT}`);
  console.log(`  Output:  ${OUT_ROOT}`);
  console.log(`  Filter:  ${ONLY ?? 'all'}`);
  console.log(`  Files:   ${files.length}\n`);

  let processed = 0;
  let skipped   = 0;
  let errors    = 0;

  for (const srcPath of files) {
    const rel     = relative(SRC_ROOT, srcPath);
    const preset  = getPreset(rel);
    const ext     = extname(srcPath).toLowerCase();

    // Build output path
    const relWebp  = rel.replace(/\.(png|jpe?g|webp)$/i, '.webp');
    const outWebp  = join(OUT_ROOT, relWebp);
    const outDir   = dirname(outWebp);

    const label = `  [${preset.key}] ${rel}`;

    if (DRY_RUN) {
      const dims = preset.width ? ` → ${preset.width}×${preset.height}` : '';
      console.log(`${label}  q=${preset.quality}${dims}  → ${relWebp}`);
      processed++;
      continue;
    }

    try {
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

      let pipeline = sharp(srcPath);

      if (preset.width && preset.height) {
        pipeline = pipeline.resize(preset.width, preset.height, {
          fit:                preset.fit ?? 'inside',
          withoutEnlargement: true,
        });
      } else if (preset.width) {
        pipeline = pipeline.resize(preset.width, undefined, { withoutEnlargement: true });
      }

      // Always output WebP
      await pipeline
        .clone()
        .webp({ quality: preset.quality, effort: 5 })
        .toFile(outWebp);

      // Optional PNG fallback for transparency-sensitive assets
      if (preset.keepPng && ext === '.png') {
        const outPng = join(OUT_ROOT, rel);
        const outPngDir = dirname(outPng);
        if (!existsSync(outPngDir)) mkdirSync(outPngDir, { recursive: true });
        await pipeline
          .clone()
          .png({ compressionLevel: 9, adaptiveFiltering: true })
          .toFile(outPng);
      }

      process.stdout.write(`  ✓ ${rel}\n`);
      processed++;
    } catch (e) {
      console.error(`  ✗ ${rel}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n  Done. ${processed} processed, ${skipped} skipped, ${errors} errors.\n`);

  if (!DRY_RUN && processed > 0) {
    console.log('  To use optimized assets in the app, update Vite config to serve');
    console.log('  /assets-optimized/ before /assets/, or update paths in assets.ts.\n');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
