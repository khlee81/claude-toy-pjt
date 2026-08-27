# `pickRotateClickThreshold`가 `pickLuckyStageIndex`와 같은 배열-인덱싱 패턴을 중복한다

`features/marble-game/game-rules.ts`의 두 함수 모두 `Math.min(len-1, Math.floor(random()*len))`
패턴으로 배열에서 하나를 고른다. `pickFromArray(array, random)` 공통 헬퍼로 묶으면 정리된다.
