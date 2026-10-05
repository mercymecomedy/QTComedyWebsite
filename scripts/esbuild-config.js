/**
 * Shared esbuild options for the browser asset pipeline.
 *
 * Used by:
 *   - scripts/build-assets.js  (production build, minified)
 *   - scripts/dev.js           (watch mode, unminified)
 *
 * There is a single entry point: src/assets/js/main.js imports the
 * stylesheets (src/assets/css/main.css + @fontsource CSS) so esbuild emits
 * _site/assets/main.js and _site/assets/main.css together. Font files
 * referenced by the CSS land in _site/assets/fonts/ via assetNames.
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
    assetNames: 'fonts/[name]-[hash]',
    loader: { '.woff': 'file', '.woff2': 'file' },
    logLevel: 'info',
  };
}

module.exports = { jsOptions };
