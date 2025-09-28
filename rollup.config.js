import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/max-integration.ts',
  output: {
    file: 'dist/cc-router.js',
    format: 'iife',
    name: 'CCRouterMax',
    // Make functions available globally for Max
    outro: `
// Expose functions to Max global scope
const exportedFunctions = {
  loadbang, bang, closebang, list, msg_int, msg_float,
  setmapping, removemapping, debug, testcc, config,
  trackinfo, setupfor, help, track_observer
};

// Assign each function to the global scope
for (const [name, fn] of Object.entries(exportedFunctions)) {
  if (typeof fn === 'function') {
    globalThis[name] = fn;
  }
}
    `
  },
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      outputToFilesystem: true
    }),
    // Optional: minification for production builds
    // terser()
  ],
  // Tell Rollup to treat Max globals as external
  external: [],
  // Suppress warnings about circular dependencies or unused externals
  onwarn: function(warning, warn) {
    // Skip certain warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
    // Use default for everything else
    warn(warning);
  }
};