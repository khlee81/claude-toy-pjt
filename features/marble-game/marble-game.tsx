"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  HARD_SCORE_MULTIPLIER,
  LUCKY_BONUS,
  STAGE_COUNT,
  TIME_LIMIT_MS,
  TOTAL_MARBLE_COUNT,
  WARN_AFTER_MS,
  type GameMode,
} from "./game-rules";
import { Fireworks } from "./fireworks";
import { HexBoard } from "./hex-board";
import styles from "./marble-game.module.css";
import {
  copyResultImage,
  downloadResultImage,
  renderResultImage,
} from "./result-image";
import { useMarbleGame } from "./use-marble-game";

const WARN_AFTER_SECONDS = WARN_AFTER_MS / 1000;
const TIME_LIMIT_SECONDS = TIME_LIMIT_MS / 1000;

function formatSeconds(elapsedMs: number) {
  return `${(elapsedMs / 1000).toFixed(1)}초`;
}

export function MarbleGame() {
  const game = useMarbleGame();
  const [mode, setMode] = useState<GameMode>("easy");
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | undefined>(undefined);
  const lastRotationEventCountRef = useRef(0);

  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), []);

  const running = game.phase === "countdown" || game.phase === "playing";
  const finished = game.phase === "result";
  const hard = game.mode === "hard";

  // 안내를 연달아 띄우면 앞 타이머가 뒤 메시지를 일찍 지우므로 매번 갈아 끼운다.
  function showNotice(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2200);
  }

  // 회전이 걸릴 때마다 한 번씩 알려 준다. 새 판이 시작되며 0으로 초기화된 것과,
  // 실제로 방금 회전이 걸린 것을 ref로 구분한다. 언제, 몇 번, 어느 쪽으로 돌지는
  // 미리 알리지 않는다. 안내 표시는 다른 타이머 기반 effect들과 같은 방식으로
  // setTimeout 콜백 안에서 띄운다.
  useEffect(() => {
    if (game.rotationEventCount === lastRotationEventCountRef.current) return;
    lastRotationEventCountRef.current = game.rotationEventCount;
    if (game.rotationEventCount === 0) return;

    const direction = game.lastRotationDirection;
    const timer = window.setTimeout(() => {
      showNotice(`타일이 ${direction === "right" ? "오른쪽" : "왼쪽"}으로 돌았습니다!`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game.rotationEventCount, game.lastRotationDirection]);

  const multiplierSuffix = hard ? ` × ${HARD_SCORE_MULTIPLIER}` : "";
  const luckyNote = game.luckyTaken
    ? ` + 행운 ${game.scoreLuckyBonus}`
    : "";
  const scoreNote = game.cleared
    ? `구슬 ${game.lastClickedNumber}${multiplierSuffix} + 남은 시간 ${game.remainingBonusSeconds}${multiplierSuffix}${luckyNote}`
    : `마지막으로 맞게 누른 구슬: ${game.lastClickedNumber}${multiplierSuffix}${luckyNote}`;

  function buildResultImage() {
    return renderResultImage({
      marbles: game.marbles,
      lucky: game.lucky,
      score: game.score,
      cleared: game.cleared,
      scoreNote,
    });
  }

  async function handleCapture() {
    const saved = await downloadResultImage(buildResultImage(), game.score);
    showNotice(
      saved
        ? "결과 화면을 이미지 파일로 저장했습니다"
        : "이미지를 만들지 못했습니다"
    );
  }

  async function handleCopy() {
    const copied = await copyResultImage(buildResultImage());
    showNotice(
      copied
        ? "결과 이미지를 클립보드에 복사했습니다"
        : "이 브라우저에서는 복사할 수 없습니다. 결과 캡쳐를 눌러 저장하세요"
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3.5 px-4 py-6 sm:gap-4 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          오늘도 구슬에 털림💀
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => game.start(mode)} disabled={running}>
            게임 시작
          </Button>
          <Button variant="outline" onClick={game.stop} disabled={!running}>
            게임 종료
          </Button>
          <Button variant="outline" onClick={game.showHelp} disabled={running}>
            게임 설명
          </Button>
          <label className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">난이도</span>
            <select
              aria-label="난이도"
              className="h-9 rounded-[var(--radius-md)] border border-input bg-background px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-45"
              value={mode}
              disabled={running}
              onChange={(event) => setMode(event.target.value as GameMode)}
            >
              <option value="easy">쉬움</option>
              <option value="hard">어려움</option>
            </select>
          </label>
        </div>
      </header>

      <HexBoard
        marbles={game.marbles}
        lucky={game.lucky}
        interactive={game.phase === "playing"}
        hintedNumber={game.hintedNumber}
        warning={game.warning}
        rotationDeg={game.rotationDeg}
        rotationAxisSwapped={game.rotationAxisSwapped}
        onMarbleClick={game.clickMarble}
        onLuckyClick={game.clickLucky}
        onEmptyClick={game.clickEmpty}
      >
        {game.phase === "idle" ? (
          <div className={cn(styles.overlay, styles.overlayDim)}>
            <div className="max-w-md rounded-[var(--radius-lg)] border bg-card p-5 text-left shadow-lg sm:p-6">
              <h2 className="mb-2.5 text-base font-semibold">
                이렇게 하시면 됩니다
              </h2>
              <ol className="grid list-decimal gap-1.5 pl-4 text-sm leading-relaxed">
                <li>빙하 타일 위에 숫자가 적힌 구슬이 나타납니다.</li>
                <li>
                  1번부터 순서대로 클릭하세요. 맞게 누르면 구슬이 사라집니다.
                </li>
                <li>
                  화면의 구슬을 다 누르면 다음 단계가 바로 나옵니다. 다 못
                  눌러도 2초가 지나면 구슬이 더 쌓입니다.
                </li>
                <li>순서를 틀리거나 빈 타일을 누르면 그 자리에서 끝납니다.</li>
                <li>
                  {TOTAL_MARBLE_COUNT}번까지 모두 누르면 클리어입니다. 단계는
                  모두 {STAGE_COUNT}단계입니다.
                </li>
              </ol>

              <div className={styles.luckyNotice}>
                <span
                  className={cn(
                    styles.marble,
                    styles.marbleLucky,
                    styles.luckySample
                  )}
                  aria-hidden="true"
                >
                  <span className={styles.marbleLuckyAurora} />
                  <span className={styles.marbleLuckyMark}>★</span>
                </span>
                <span>
                  <span className={styles.luckyNoticeTitle}>
                    무지개빛 행운 구슬
                  </span>
                  <p className={styles.luckyNoticeBody}>
                    3~5단계 사이에 딱 한 번 나타납니다. 순서와 상관없이 아무 때나
                    눌러도 되고, 누르면{" "}
                    <span className={styles.luckyNoticePoint}>
                      점수에 {LUCKY_BONUS}점
                    </span>
                    이 붙습니다.
                  </p>
                </span>
              </div>

              <p className="mt-3.5 border-t pt-3 text-[13px] leading-relaxed text-muted-foreground">
                제한 시간은 {TIME_LIMIT_SECONDS}초입니다. {WARN_AFTER_SECONDS}
                초를 넘기면 판 둘레가 붉게 변합니다. 점수는 마지막으로 맞게 누른
                구슬의 숫자이고, 클리어하면 남은 시간만큼 더해집니다.
                {mode === "hard"
                  ? ` 어려움 모드에서는 이 점수가 모두 ${HARD_SCORE_MULTIPLIER}배가 됩니다.`
                  : ""}
              </p>
            </div>
          </div>
        ) : null}

        {game.phase === "countdown" ? (
          <div className={styles.overlay}>
            <div
              key={game.countdownLabel}
              className={cn(
                styles.countdown,
                game.countdownLabel === "시작" && styles.countdownGo
              )}
            >
              {game.countdownLabel}
            </div>
          </div>
        ) : null}

        {finished ? (
          <div className={cn(styles.overlay, styles.overlayDim)}>
            <Fireworks active={game.cleared} seedBase={game.elapsedMs} />
            <div className="relative z-10 min-w-[240px] rounded-[var(--radius-lg)] border bg-card px-6 py-4 shadow-lg">
              <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">
                {game.cleared ? "완벽 클리어" : "종료"}
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  game.cleared ? "text-primary" : "text-destructive"
                )}
              >
                {game.cleared ? "환상적이에요! 클리어!" : "게임 종료"}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {game.ending === "clear"
                  ? `${TOTAL_MARBLE_COUNT}개의 구슬을 하나도 놓치지 않았어요! 점수에 ${game.scoreTimeBonus}점이 더해졌습니다.`
                  : game.ending === "timeout"
                    ? `${TIME_LIMIT_SECONDS}초가 지났습니다.`
                    : game.ending === "stopped"
                      ? "게임을 중단했습니다."
                      : "순서에 맞지 않는 곳을 눌렀습니다."}
              </p>
              {game.ending === "clear" && game.mode === "easy" ? (
                <p className="mt-2 text-[13px] font-medium text-primary">
                  다음엔 어려움 모드에도 도전해 보세요! 위쪽 난이도에서 바꿀 수
                  있어요.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {notice ? (
          <p
            role="status"
            className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3.5 py-2 text-[13px] text-background shadow-lg"
          >
            {notice}
          </p>
        ) : null}
      </HexBoard>

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border bg-card px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {game.phase === "playing" ? "시간" : "점수"}
          </span>
          {game.phase === "playing" ? (
            <span className="min-w-[92px] text-2xl font-bold tabular-nums tracking-tight">
              {formatSeconds(game.elapsedMs)}
            </span>
          ) : finished ? (
            <span className="min-w-[92px] text-2xl font-bold tabular-nums tracking-tight">
              {game.score}점
            </span>
          ) : (
            <span className="min-w-[92px] text-lg font-medium text-muted-foreground">
              –
            </span>
          )}
          <span className="text-[13px] text-muted-foreground">
            {game.phase === "playing"
              ? `${TIME_LIMIT_SECONDS}초가 되면 끝납니다`
              : finished
                ? scoreNote
                : "게임을 시작하면 시간이 표시됩니다"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleCapture} disabled={!finished}>
            결과 캡쳐
          </Button>
          <Button variant="outline" onClick={handleCopy} disabled={!finished}>
            결과 복사
          </Button>
        </div>
      </footer>
    </div>
  );
}
