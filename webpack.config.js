const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const appDirectory = path.resolve(__dirname);

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
].map((moduleName) => path.resolve(appDirectory, `node_modules/${moduleName}`));

// Babel loader configuration
const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.js'),
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
    // Exclude problematic Expo modules that have TypeScript issues
    /expo-modules-core\/src\/ts-declarations/,
    /expo-camera/,
    /expo-status-bar\/src\/types/,
  ],
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      babelrc: false,
      configFile: false,
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['last 2 versions', 'not dead', '> 0.2%'],
            },
            modules: false,
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
  test: /\.(gif|jpe?g|png|svg)$/,
  type: 'asset/resource',
  generator: {
    filename: 'images/[name].[hash][ext]',
  },
};

// Font loader configuration
const fontLoaderConfiguration = {
  test: /\.(woff|woff2|ttf|otf|eot)$/,
  type: 'asset/resource',
  generator: {
    filename: 'fonts/[name].[hash][ext]',
  },
};

module.exports = {
  entry: path.resolve(appDirectory, 'index.web.js'),

  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(appDirectory, 'dist'),
    publicPath: '/',
    clean: true,
  },

  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-web': path.resolve(__dirname, 'node_modules/react-native-web'),
      // Ignore problematic expo modules on web
      'expo-camera': path.resolve(__dirname, 'src/mocks/expo-camera.js'),
      'expo-status-bar': path.resolve(__dirname, 'src/mocks/expo-status-bar.js'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.web.jsx', '.tsx', '.ts', '.js', '.jsx', '.mjs'],
    fullySpecified: false,
    fallback: {
      process: require.resolve('process/browser'),
      buffer: require.resolve('buffer/'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      assert: require.resolve('assert/'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      url: require.resolve('url/'),
    },
  },

  module: {
    rules: [
      babelLoaderConfiguration,
      imageLoaderConfiguration,
      fontLoaderConfiguration,
      // Handle .mjs files
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'public', 'index.html'),
      filename: 'index.html',
      inject: 'body',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      __DEV__: process.env.NODE_ENV !== 'production',
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    // Ignore problematic modules
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
  ],

  devServer: {
    static: {
      directory: path.join(appDirectory, 'public'),
    },
    historyApiFallback: true,
    compress: true,
    hot: true,
    port: 3000,
    open: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },

  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'cheap-module-source-map',

  performance: {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  
  ignoreWarnings: [
    /Failed to parse source map/,
    /export .* was not found/,
  ],
};