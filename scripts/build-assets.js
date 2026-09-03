/**
 * Production asset build. Bundles/minifies browser JS and CSS into
 * _site/assets/ via esbuild. Run before Eleventy (npm run build wires
 * the order) so validate-build.js can assert the assets exist.
 */
const esbuild = require('esbuild');
const { jsOptions, cssOptions } = require('./esbuild-config.js');

Promise.all([
  esbuild.build(jsOptions(true)),
  esbuild.build(cssOptions(true)),
]).catch((err) => {
  console.error('[build-assets] failed:', err.message);
  process.exit(1);
});
