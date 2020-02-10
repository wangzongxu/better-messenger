import typescript from 'rollup-plugin-typescript2'
import { eslint } from 'rollup-plugin-eslint'
import replace from 'rollup-plugin-replace'

const isDev = process.env.TARGET === 'development'

const config = {
  input: './src/index.ts',
  plugins: [
    eslint(),
    typescript({ useTsconfigDeclarationDir: !isDev }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.TARGET)
    })
  ],
  watch: {
    include: 'src/**'
  }
}

const umd = {
  ...config,
  output: {
    file: './dist/index.js',
    format: 'umd',
    sourcemap: isDev,
    name: 'betterMessenger'
  }
}

const esm = {
  ...config,
  output: {
    file: './es/index.js',
    format: 'es'
  }
}

const commonjs = {
  ...config,
  output: {
    file: './lib/index.js',
    format: 'cjs'
  }
}

export default isDev
  ? umd : [umd, esm, commonjs]
