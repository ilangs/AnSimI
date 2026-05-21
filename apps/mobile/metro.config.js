// Metro 설정 — 모노레포 (Yarn/npm workspaces) 지원
// 참고: https://docs.expo.dev/guides/monorepos/
//
// 문제: 직접 gradlew assembleRelease 호출 시 Metro가 프로젝트 루트를
//       'C:\AnSimI/'로 잘못 인식하여 expo-router/entry.js를 찾지 못함
//       → workspace root의 node_modules는 hoisting 되어 있는데 인식 못 함
//
// 해결: projectRoot/workspaceRoot 명시 + nodeModulesPaths 양쪽 검색

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 1. Expo 앱 루트 (apps/mobile)
const projectRoot = __dirname;

// 2. 워크스페이스 루트 (C:\AnSimI) — node_modules가 hoisting 됨
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 3. 워크스페이스 전체를 watch (모노레포 다른 패키지 변경 감지)
config.watchFolders = [workspaceRoot];

// 4. node_modules 검색 우선순위
//    a) apps/mobile/node_modules (로컬, 일부 패키지만)
//    b) C:\AnSimI\node_modules    (워크스페이스 hoisted, 대부분 여기)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// disableHierarchicalLookup은 의도적으로 미설정 (false)
// 이유: true 시 Node.js 표준 부모 디렉토리 traversal 차단됨
//       → react-native 내부의 'promise/setimmediate/es6-extensions' 같은
//         transitive dependency 해석 실패
// 트레이드오프: 워크스페이스 내 동일 패키지 중복 시 모호할 수 있으나
//             nodeModulesPaths 순서로 우선순위 결정됨

module.exports = config;
