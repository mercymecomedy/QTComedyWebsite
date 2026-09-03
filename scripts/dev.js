/**
 * Dev server: esbuild watch (JS + CSS into _site/assets/) alongside
 * Eleventy --serve. Ctrl+C tears down both.
 */
const esbuild = require('esbuild');
const { spawn } = require('child_process');
const { jsOptions, cssOptions } = require('./esbuild-config.js');

async function main() {
  const jsCtx = await esbuild.context(jsOptions(false));
  const cssCtx = await esbuild.context(cssOptions(false));
  await Promise.all([jsCtx.watch(), cssCtx.watch()]);

  // Invoke the Eleventy CLI directly (bin is cmd.cjs in Eleventy 3).
  const eleventy = spawn(process.execPath, [require.resolve('@11ty/eleventy/cmd.cjs'), '--serve'], {
    stdio: 'inherit',
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    eleventy.kill('SIGTERM');
    Promise.all([jsCtx.dispose(), cssCtx.dispose()]).then(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[dev] failed:', err.message);
  process.exit(1);
});
