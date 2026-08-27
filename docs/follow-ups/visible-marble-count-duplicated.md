# 구슬+행운 구슬 개수 계산이 여러 곳에 중복된다

`features/marble-game/use-marble-game.ts`의 `addNextStage`(놀림 캐릭터 문턱 판정)와
훅이 반환하는 `visibleMarbleCount`(다음 구슬 안내 문턱 판정)가 둘 다
`marbles.length + (lucky ? 1 : 0)`를 각자 계산한다. `visibleMarbleCountOf(state)`
같은 공통 헬퍼로 묶으면 정리된다.
