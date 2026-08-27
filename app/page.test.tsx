import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("처음 열면 게임 설명이 보이고 결과 버튼은 눌리지 않는다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "오늘도 구슬에 털림💀" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 2, name: /이렇게 하시면 됩니다/ })
  ).toBeInTheDocument();

  expect(screen.getByRole("button", { name: "게임 시작" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "게임 종료" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "게임 설명" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "결과 캡쳐" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "결과 복사" })).toBeDisabled();
});

test("게임 시작을 누르면 카운트다운이 뜨고 시작·설명 버튼이 잠긴다", () => {
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "게임 시작" }));

  expect(screen.getByText("3")).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { level: 2, name: /이렇게 하시면 됩니다/ })
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "게임 시작" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "게임 설명" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "게임 종료" })).toBeEnabled();
});
