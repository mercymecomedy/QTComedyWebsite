/**
 * Shared esbuild options for the browser asset pipeline.
 *
 * Used by:
 *   - scripts/build-assets.js  (production build, minified)
 *   - scripts/dev.js           (watch mode, unminified)
 *
 * Output goes straight into _site/assets/, which Eleventy leaves alone
 * (verified: Eleventy 3 full builds do not wipe pre-existing output files).
 */

function jsOptions(minify) {
  return {
    entryPoints: ['src/assets/js/main.js'],
    bundle: true,
    minify,
    outfile: '_site/assets/main.js',
    target: ['es2019'],
    logLevel: 'info',
  };
}

function cssOptions(minify) {
  return {
    entryPoints: ['src/assets/css/main.css'],
    minify,
    outfile: '_site/assets/main.css',
    logLevel: 'info',
  };
}

module.exports = { jsOptions, cssOptions };
