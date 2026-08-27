# 어려움 모드 회전 애니메이션이 좁은 화면에서 잠깐 가로 스크롤을 만든다

**증상** — 어려움 모드에서 판이 90도로 돌 때, `features/marble-game/marble-game.module.css`의
`.grid`(`transform: rotate(var(--rotate)); transition: transform 0.6s ease;`)가 0도에서
목표 각도로 부드럽게 넘어간다. 회전 도중(특히 대각선에 가까운 중간 각도)에는 사각형의
바운딩 박스가 시작·끝 각도보다 커져, 375px 폭 화면에서 `document.documentElement.scrollWidth`가
잠깐 389px까지 올라간다.

**확인한 것** — Chromium에서 회전 시작 직후(90ms 이전) 한 번만 관측되고, 그 뒤로는 375px로
돌아온다. 전환이 끝나면(약 0.6초 뒤) 레이아웃은 정상이고 가로 스크롤바가 남지 않는다.
게임 진행에는 영향이 없다.

**다음 단계** — `.board`에 회전 중에만 `overflow: hidden`을 걸거나, 회전 애니메이션의 easing을
바꿔 중간 각도에서의 바운딩 박스 증가를 줄이는 방법을 검토한다. 다만 `overflow: hidden`은
회전 중인 구슬이 잘려 보이는 부작용이 있어 실제로 어색해 보이는지 먼저 확인해야 한다.
