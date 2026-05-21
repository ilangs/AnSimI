// 모노레포 진입점 래퍼
//
// 배경: package.json의 main을 "expo-router/entry" (bare module specifier)로
//       두면 Gradle bundle task가 잘못된 상대 경로로 변환하여 빌드 실패.
//       monorepo + hoisted node_modules 환경에서 흔한 이슈.
//
// 해결: 로컬 index.js로 한 단계 우회 — require()는 Node 표준 hierarchical
//       lookup을 사용하므로 hoisted node_modules도 정상 탐색.

import 'expo-router/entry';
