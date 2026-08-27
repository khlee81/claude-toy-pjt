"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  COUNTDOWN_STEPS,
  COUNTDOWN_STEP_MS,
  HINT_AFTER_MARBLE_COUNT,
  STAGE_COUNT,
  STAGE_INTERVAL_MS,
  TIME_LIMIT_MS,
  TOTAL_MARBLE_COUNT,
  WARN_AFTER_MS,
  calculateScore,
  createStageMarbles,
  type GameEnding,
  type Marble,
} from "./game-rules";

export type GamePhase = "idle" | "countdown" | "playing" | "result";

type State = {
  phase: GamePhase;
  countdownStep: number;
  marbles: Marble[];
  stageIndex: number;
  nextNumber: number;
  lastClickedNumber: number;
  elapsedMs: number;
  ending: GameEnding | null;
};

type Action =
  | { type: "start" }
  | { type: "countdown-next" }
  | { type: "begin-play" }
  | { type: "tick"; elapsedMs: number }
  | { type: "spawn-stage" }
  | { type: "click-marble"; number: number; elapsedMs: number }
  | { type: "click-empty"; elapsedMs: number }
  | { type: "stop"; elapsedMs: number }
  | { type: "show-help" };

const initialState: State = {
  phase: "idle",
  countdownStep: 0,
  marbles: [],
  stageIndex: 0,
  nextNumber: 1,
  lastClickedNumber: 0,
  elapsedMs: 0,
  ending: null,
};

function endGame(state: State, ending: GameEnding, elapsedMs: number): State {
  return { ...state, phase: "result", ending, elapsedMs };
}

function addNextStage(state: State): State {
  if (state.stageIndex >= STAGE_COUNT) return state;
  return {
    ...state,
    marbles: [
      ...state.marbles,
      ...createStageMarbles(state.marbles, state.stageIndex),
    ],
    stageIndex: state.stageIndex + 1,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...initialState, phase: "countdown" };

    case "countdown-next":
      return { ...state, countdownStep: state.countdownStep + 1 };

    case "begin-play":
      return addNextStage({
        ...initialState,
        phase: "playing",
      });

    case "tick": {
      if (state.phase !== "playing") return state;
      if (action.elapsedMs >= TIME_LIMIT_MS) {
        return endGame(state, "timeout", TIME_LIMIT_MS);
      }
      return { ...state, elapsedMs: action.elapsedMs };
    }

    case "spawn-stage":
      if (state.phase !== "playing") return state;
      return addNextStage(state);

    case "click-marble": {
      if (state.phase !== "playing") return state;
      if (action.number !== state.nextNumber) {
        return endGame(state, "miss", action.elapsedMs);
      }

      const remaining = state.marbles.filter(
        (marble) => marble.number !== action.number
      );
      const advanced: State = {
        ...state,
        marbles: remaining,
        lastClickedNumber: action.number,
        nextNumber: state.nextNumber + 1,
        elapsedMs: action.elapsedMs,
      };

      if (advanced.nextNumber > TOTAL_MARBLE_COUNT) {
        return endGame(advanced, "clear", action.elapsedMs);
      }
      // 화면을 다 비웠으면 다음 단계를 기다리지 않고 바로 채운다.
      return remaining.length === 0 ? addNextStage(advanced) : advanced;
    }

    case "click-empty":
      if (state.phase !== "playing") return state;
      return endGame(state, "miss", action.elapsedMs);

    case "stop":
      if (state.phase === "countdown") return initialState;
      if (state.phase !== "playing") return state;
      return endGame(state, "stopped", action.elapsedMs);

    case "show-help":
      return initialState;

    default:
      return state;
  }
}

export function useMarbleGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const startedAtRef = useRef(0);

  const readElapsed = useCallback(
    () =>
      startedAtRef.current === 0
        ? 0
        : Math.min(TIME_LIMIT_MS, performance.now() - startedAtRef.current),
    []
  );

  // 카운트다운: 3 → 2 → 1 → 시작 순서로 넘기고, 끝나면 판을 연다.
  useEffect(() => {
    if (state.phase !== "countdown") return;

    const isLastStep = state.countdownStep >= COUNTDOWN_STEPS.length - 1;
    const timer = window.setTimeout(() => {
      if (isLastStep) {
        startedAtRef.current = performance.now();
        dispatch({ type: "begin-play" });
      } else {
        dispatch({ type: "countdown-next" });
      }
    }, COUNTDOWN_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [state.phase, state.countdownStep]);

  // 경과 시간. 제한 시간을 넘기는 순간의 강제 종료도 여기서 판정한다.
  useEffect(() => {
    if (state.phase !== "playing") return;

    const timer = window.setInterval(() => {
      dispatch({ type: "tick", elapsedMs: readElapsed() });
    }, 50);

    return () => window.clearInterval(timer);
  }, [state.phase, readElapsed]);

  // 구슬을 다 누르지 못해도 2초가 지나면 다음 단계를 얹는다.
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (state.stageIndex >= STAGE_COUNT) return;

    const timer = window.setTimeout(() => {
      dispatch({ type: "spawn-stage" });
    }, STAGE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [state.phase, state.stageIndex]);

  const start = useCallback(() => {
    startedAtRef.current = 0;
    dispatch({ type: "start" });
  }, []);

  const stop = useCallback(() => {
    dispatch({ type: "stop", elapsedMs: readElapsed() });
  }, [readElapsed]);

  const showHelp = useCallback(() => {
    startedAtRef.current = 0;
    dispatch({ type: "show-help" });
  }, []);

  const clickMarble = useCallback(
    (number: number) => {
      dispatch({ type: "click-marble", number, elapsedMs: readElapsed() });
    },
    [readElapsed]
  );

  const clickEmpty = useCallback(() => {
    dispatch({ type: "click-empty", elapsedMs: readElapsed() });
  }, [readElapsed]);

  const cleared = state.ending === "clear";

  return {
    phase: state.phase,
    countdownLabel: COUNTDOWN_STEPS[state.countdownStep],
    marbles: state.marbles,
    nextNumber: state.nextNumber,
    lastClickedNumber: state.lastClickedNumber,
    elapsedMs: state.elapsedMs,
    ending: state.ending,
    cleared,
    /** 판이 붐빌 때만 다음에 눌러야 할 구슬 번호를 알려 준다. */
    hintedNumber:
      state.phase === "playing" &&
      state.marbles.length > HINT_AFTER_MARBLE_COUNT
        ? state.nextNumber
        : null,
    warning: state.phase === "playing" && state.elapsedMs > WARN_AFTER_MS,
    score: calculateScore({
      lastClickedNumber: state.lastClickedNumber,
      cleared,
      elapsedMs: state.elapsedMs,
    }),
    remainingBonusSeconds: Math.max(
      0,
      Math.floor((TIME_LIMIT_MS - state.elapsedMs) / 1000)
    ),
    start,
    stop,
    showHelp,
    clickMarble,
    clickEmpty,
  };
}
