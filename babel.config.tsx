module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Optional: Add these plugins for better development experience
      'react-native-reanimated/plugin', // If using react-native-reanimated
    ],
    env: {
      development: {
        plugins: [
          // Development-specific plugins can go here
        ],
      },
      production: {
        plugins: [
          // Production optimizations
          'transform-remove-console', // Optional: Remove console logs in production
        ],
      },
    },
  };
};