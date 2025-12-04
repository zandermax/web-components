import terser from '@rollup/plugin-terser';

const input = 'src/dial-selector.js';
const name = 'DialSelector';

const isDev = process.env.ROLLUP_WATCH === 'true';

// Base ESM config (used for both dev and production)
const esmConfig = {
  input,
  output: {
    file: 'dist/dial-selector.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    // Only minify in production
    !isDev && terser(),
  ].filter(Boolean),
};

// Production-only builds (CJS and UMD)
const productionConfigs = isDev
  ? []
  : [
      // CommonJS build (for Node.js/bundlers)
      {
        input,
        output: {
          file: 'dist/dial-selector.cjs',
          format: 'cjs',
          sourcemap: true,
        },
        plugins: [terser()],
      },
      // UMD build (for browser script tag)
      {
        input,
        output: {
          file: 'dist/dial-selector.umd.js',
          format: 'umd',
          name,
          sourcemap: true,
        },
        plugins: [terser()],
      },
    ];

export default [esmConfig, ...productionConfigs];
