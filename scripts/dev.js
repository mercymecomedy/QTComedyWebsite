/**
 * Dev server: esbuild watch (JS + CSS + fonts into _site/assets/) alongside
 * Eleventy --serve. Ctrl+C tears down both.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { spawn } = require('child_process');
const { jsOptions } = require('./esbuild-config.js');

/**
 * Resolve the Eleventy CLI script. The package's "exports" map hides
 * cmd.cjs from require.resolve, so locate it via the package root instead.
 * @returns {string} absolute path to the Eleventy bin script
 */
function resolveEleventyBin() {
  const mainEntry = require.resolve('@11ty/eleventy');
  const packageRoot = path.resolve(path.dirname(mainEntry), '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  return path.join(packageRoot, packageJson.bin.eleventy);
}

async function main() {
  const eleventyBin = resolveEleventyBin();

  const jsCtx = await esbuild.context(jsOptions(false));
  await jsCtx.watch();

  const eleventy = spawn(process.execPath, [eleventyBin, '--serve'], {
    stdio: 'inherit',
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    eleventy.kill('SIGTERM');
    jsCtx.dispose().then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev] failed:', err.message);
  process.exit(1);
});
