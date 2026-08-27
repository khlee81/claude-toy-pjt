# 결과 캡쳐의 blob URL을 다운로드 시작 전에 해제할 수 있다

**증상** — `features/marble-game/result-image.ts`의 `downloadResultImage`가
`link.click()` 직후 동기적으로 `URL.revokeObjectURL(url)`을 호출한다. 다운로드를
비동기로 큐에 넣는 브라우저에서는 해제가 먼저 일어나 빈 파일이 저장되거나 다운로드가
조용히 실패할 수 있다. 이때도 함수는 `true`를 반환하므로 사용자에게는 저장 성공으로
안내된다.

**확인한 것** — Chromium(Playwright e2e `결과 캡쳐를 누르면 점수가 담긴 이미지를
내려받는다`)에서는 정상 동작하고 이미지 내용도 확인했다. 다른 브라우저는 이 환경에서
재현하지 못했다.

**다음 단계** — `revokeObjectURL`을 `setTimeout(..., 0)` 또는 그 이상으로 미루고,
Firefox와 Safari에서 다운로드를 확인한다.
