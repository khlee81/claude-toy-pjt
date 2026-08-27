"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { BOARD_COLS, BOARD_ROWS, type Marble } from "./game-rules";
import styles from "./marble-game.module.css";

type HexBoardProps = {
  marbles: Marble[];
  /** 진행 중일 때만 구슬과 빈 타일 클릭을 게임 입력으로 받는다. */
  interactive: boolean;
  warning: boolean;
  onMarbleClick: (marbleNumber: number) => void;
  onEmptyClick: () => void;
  children?: ReactNode;
};

export function HexBoard({
  marbles,
  interactive,
  warning,
  onMarbleClick,
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

              return (
                <div key={tileIndex} className={styles.tile}>
                  {marble ? (
                    <button
                      type="button"
                      className={styles.marble}
                      aria-label={`구슬 ${marble.number}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (interactive) onMarbleClick(marble.number);
                      }}
                    >
                      {marble.number}
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
