import shebang from 'rollup-plugin-shebang';
import json from 'rollup-plugin-json';
import cleanup from 'rollup-plugin-cleanup';


export default {
  entry: 'src/index.js',
  format: 'cjs',
  dest: 'lib/index.js',
  plugins: [
    shebang(),
    json(),
    cleanup(),
  ],
  external: [
    'path',
    'co',
    'ali-oss',
    'klaw',
    'commander',
  ],
};
