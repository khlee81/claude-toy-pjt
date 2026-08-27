"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  STAGE_COUNT,
  TIME_LIMIT_MS,
  TOTAL_MARBLE_COUNT,
  WARN_AFTER_MS,
} from "./game-rules";
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
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(noticeTimerRef.current), []);

  const running = game.phase === "countdown" || game.phase === "playing";
  const finished = game.phase === "result";

  const scoreNote = game.cleared
    ? `구슬 ${game.lastClickedNumber} + 남은 시간 ${game.remainingBonusSeconds}`
    : `마지막으로 맞게 누른 구슬: ${game.lastClickedNumber}`;

  // 안내를 연달아 띄우면 앞 타이머가 뒤 메시지를 일찍 지우므로 매번 갈아 끼운다.
  function showNotice(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2200);
  }

  function buildResultImage() {
    return renderResultImage({
      marbles: game.marbles,
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
          점심시간을 즐겁게~
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={game.start} disabled={running}>
            게임 시작
          </Button>
          <Button variant="outline" onClick={game.stop} disabled={!running}>
            게임 종료
          </Button>
          <Button variant="outline" onClick={game.showHelp} disabled={running}>
            게임 설명
          </Button>
        </div>
      </header>

      <HexBoard
        marbles={game.marbles}
        interactive={game.phase === "playing"}
        hintedNumber={game.hintedNumber}
        warning={game.warning}
        onMarbleClick={game.clickMarble}
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
              <p className="mt-3.5 border-t pt-3 text-[13px] leading-relaxed text-muted-foreground">
                제한 시간은 {TIME_LIMIT_SECONDS}초입니다. {WARN_AFTER_SECONDS}
                초를 넘기면 판 둘레가 붉게 변합니다. 점수는 마지막으로 맞게 누른
                구슬의 숫자이고, 클리어하면 남은 시간만큼 더해집니다.
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
            <div className="min-w-[240px] rounded-[var(--radius-lg)] border bg-card px-6 py-4 shadow-lg">
              <p className="mb-1.5 text-[13px] font-medium text-muted-foreground">
                {game.cleared ? "클리어" : "종료"}
              </p>
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  game.cleared ? "text-primary" : "text-destructive"
                )}
              >
                {game.cleared ? "클리어!" : "게임 종료"}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {game.ending === "clear"
                  ? `${TOTAL_MARBLE_COUNT}번까지 모두 눌렀습니다. 남은 시간 ${game.remainingBonusSeconds}초가 더해졌습니다.`
                  : game.ending === "timeout"
                    ? `${TIME_LIMIT_SECONDS}초가 지났습니다.`
                    : game.ending === "stopped"
                      ? "게임을 중단했습니다."
                      : "순서에 맞지 않는 곳을 눌렀습니다."}
              </p>
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
