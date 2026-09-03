/**
 * Production asset build. Bundles/minifies the browser JS + CSS (single
 * esbuild entry) into _site/assets/. Run before Eleventy (npm run build
 * wires the order) so validate-build.js can assert the assets exist.
 */
const esbuild = require('esbuild');
const { jsOptions } = require('./esbuild-config.js');

esbuild.build(jsOptions(true)).catch((err) => {
  console.error('[build-assets] failed:', err.message);
  process.exit(1);
});
