"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  BOARD_COLS,
  BOARD_ROWS,
  type LuckyMarble,
  type Marble,
} from "./game-rules";
import styles from "./marble-game.module.css";

type HexBoardProps = {
  marbles: Marble[];
  /** 아직 눌리지 않은 행운 구슬. 없으면 그리지 않는다. */
  lucky: LuckyMarble | null;
  onLuckyClick: () => void;
  /** 진행 중일 때만 구슬과 빈 타일 클릭을 게임 입력으로 받는다. */
  interactive: boolean;
  /** 판이 붐빌 때 눈에 띄게 표시할 구슬 번호. 없으면 아무 구슬도 강조하지 않는다. */
  hintedNumber: number | null;
  warning: boolean;
  /** 어려움 모드에서 판을 시각적으로 돌리는 누적 각도(도). 0이면 돌지 않은 것이다. */
  rotationDeg: number;
  /** 회전이 홀수 번째 90도만큼 걸려, 가로·세로가 서로 맞바뀐 상태인지. */
  rotationAxisSwapped: boolean;
  onMarbleClick: (marbleNumber: number) => void;
  onEmptyClick: () => void;
  children?: ReactNode;
};

export function HexBoard({
  marbles,
  lucky,
  interactive,
  hintedNumber,
  warning,
  rotationDeg,
  rotationAxisSwapped,
  onMarbleClick,
  onLuckyClick,
  onEmptyClick,
  children,
}: HexBoardProps) {
  const marbleByTile = new Map(
    marbles.map((marble) => [marble.tileIndex, marble])
  );

  return (
    <div
      className={cn(styles.board, warning && styles.warning)}
      onClick={interactive ? onEmptyClick : undefined}
      data-testid="game-board"
      data-rotation={rotationDeg || undefined}
      data-axis-swapped={rotationAxisSwapped || undefined}
      style={
        rotationDeg
          ? ({ "--rotate": `${rotationDeg}deg` } as CSSProperties)
          : undefined
      }
    >
      <div className={styles.grid}>
        {Array.from({ length: BOARD_ROWS }, (_, row) => (
          <div
            key={row}
            className={cn(styles.row, row % 2 === 1 && styles.rowOffset)}
          >
            {Array.from({ length: BOARD_COLS }, (_, col) => {
              const tileIndex = row * BOARD_COLS + col;
              const marble = marbleByTile.get(tileIndex);
              const isLucky = lucky?.tileIndex === tileIndex;

              return (
                <div key={tileIndex} className={styles.tile}>
                  {isLucky ? (
                    <button
                      type="button"
                      className={styles.marbleHit}
                      aria-label="행운 구슬"
                      data-lucky=""
                      onClick={(event) => {
                        event.stopPropagation();
                        if (interactive) onLuckyClick();
                      }}
                    >
                      <span className={cn(styles.marble, styles.marbleLucky)}>
                        <span className={styles.marbleLuckyAurora} />
                        <span className={styles.marbleLuckyMark}>★</span>
                      </span>
                    </button>
                  ) : null}

                  {marble ? (
                    // 누르는 영역은 타일 전체다. 구슬 그림보다 넓게 잡아,
                    // 구슬을 겨냥한 클릭이 빈 자리로 새어 게임이 끝나지 않게 한다.
                    <button
                      type="button"
                      className={styles.marbleHit}
                      aria-label={`구슬 ${marble.number}`}
                      data-next={marble.number === hintedNumber ? "" : undefined}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (interactive) onMarbleClick(marble.number);
                      }}
                    >
                      <span
                        className={cn(
                          styles.marble,
                          marble.number === hintedNumber && styles.marbleNext
                        )}
                      >
                        {marble.number}
                      </span>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}
