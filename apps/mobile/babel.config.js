module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // NativeWind 제거 — className 미사용, metro.config.js/global.css 없음
      // jsxImportSource: 'nativewind' 제거로 번들 오류 해결
      'babel-preset-expo',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
          },
        },
      ],
      // reanimated/plugin은 반드시 마지막에 위치
      'react-native-reanimated/plugin',
    ],
  };
};
