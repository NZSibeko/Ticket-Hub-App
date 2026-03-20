```typescript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// Modules that need to be compiled
const compileNodeModules = [
  'react-native',
  'react-native-web',
  '@react-native',
  '@react-navigation',
  'expo',
  'expo-modules-core',
  'axios',
  '@expo/vector-icons',
  '@react-native-async-storage/async-storage',
].map((moduleName) => path.resolve(appDirectory, `node_modules/${moduleName}`));

// Babel loader configuration
const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/i,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.js'),
    path.resolve(appDirectory, 'App.web.js'),
    path.resolve(appDirectory, 'app'),
    path.resolve(appDirectory, 'src'),
    path.resolve(appDirectory, 'components'),
    path.resolve(appDirectory, 'screens'),
    path.resolve(appDirectory, 'services'),
    path.resolve(appDirectory, 'context'),
    path.resolve(appDirectory, 'navigation'),
    path.resolve(appDirectory, 'utils'),
    ...compileNodeModules,
  ],
  exclude: [
    /expo-modules-core\/src\/ts-declarations/,
    /expo-camera/, // Exclude problematic Expo modules that have TypeScript issues
    /expo-status-bar\/src\/types/, // Exclude problematic Expo modules that have TypeScript issues
  ],
  use: {
    loader: path.resolve(appDirectory, 'node_modules/babel-loader'),
    options: {
      cacheDirectory: true,
      babelrc: false,
      configFile: false,
      presets: [
        [
          '@babel/preset-env',
          {
            targets: ['last 2 versions', 'not dead', '> 0.2%'],
          },
        ],
        '@babel/preset-react',
        [
          '@babel/preset-typescript',
          {
            isTSX: true,
            allExtensions: true,
          },
        ],
      ],
      plugins: [
        'react-native-web',
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        '@babel/plugin-proposal-export-namespace-from',
        [
          '@babel/plugin-transform-runtime',
          {
            helpers: true,
            regenerator: true,
          },
        ],
      ],
    },
  },
};

// Image loader configuration
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/i,
  type: 'asset/resource',
  generator: {
    filename: '[name].[hash][ext]',
  },
};

// Font loader configuration
const fontLoaderConfiguration = {
  test: /\.(woff|woff2|ttf|otf|eot)$/i,
  type: 'asset/resource',
  generator: {
    filename: '[name].[hash][ext]',
  },
};

module.exports = {
  entry: path.resolve(appDirectory, 'index.web.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
  },
  resolveLoader: {
    alias: {
      assets: path.resolve(__dirname, 'assets'),
      images: path.resolve(appDirectory, 'assets/images'),
      fonts: path.resolve(appDirectory, 'assets/fonts'),
    },
  },
};
```