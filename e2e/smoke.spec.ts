import path from "node:path";

import { expect, test } from "@playwright/test";

test("게임 화면이 열리고 설명이 먼저 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("점심시간을 즐겁게~");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "점심시간을 즐겁게~"
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "이렇게 하시면 됩니다" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "결과 캡쳐" })).toBeDisabled();
});

test("시작하면 구슬이 나오고 순서대로 누르면 사라진다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1" });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });

  await firstMarble.click();
  await expect(firstMarble).toBeHidden();
  await expect(page.getByRole("button", { name: "구슬 2" })).toBeVisible();
});

test("순서를 틀리면 그 자리에서 끝나고 점수가 나온다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  await expect(page.getByRole("button", { name: "구슬 1" })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "구슬 3" }).click();

  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다.")
  ).toBeVisible();
  await expect(page.getByText("0점")).toBeVisible();
  await expect(page.getByRole("button", { name: "결과 캡쳐" })).toBeEnabled();
});

test("구슬이 5개를 넘으면 다음에 누를 구슬만 강조된다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  // 1단계 구슬은 3개뿐이라 아직 아무 구슬도 강조되지 않는다.
  await expect(page.getByRole("button", { name: "구슬 1" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("[data-next]")).toHaveCount(0);

  // 2초가 지나 4~7번이 얹히면 화면 구슬은 7개가 되고, 1번만 강조된다.
  await expect(page.getByRole("button", { name: "구슬 7" })).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.locator("[data-next]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "구슬 1" })).toHaveAttribute(
    "data-next",
    ""
  );

  // 하나 누르면 강조도 다음 번호로 옮겨간다.
  await page.getByRole("button", { name: "구슬 1" }).click();
  await expect(page.getByRole("button", { name: "구슬 2" })).toHaveAttribute(
    "data-next",
    ""
  );
});

test("구슬 그림 바깥을 눌러도 그 구슬을 누른 것으로 친다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1" });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });

  // 구슬 그림의 위쪽 가장자리 바로 바깥, 타일 안쪽을 노린다.
  const circle = (await firstMarble.locator("span").boundingBox())!;
  await page.mouse.click(circle.x + circle.width / 2, circle.y - 6);

  await expect(firstMarble).toBeHidden();
  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다.")
  ).toBeHidden();
  await expect(page.getByRole("button", { name: "구슬 2" })).toBeVisible();
});

test("구슬이 없는 자리를 누르면 그 자리에서 끝난다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1" });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });
  await firstMarble.click();

  await page.getByTestId("game-board").click({ position: { x: 8, y: 8 } });

  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다.")
  ).toBeVisible();
  await expect(page.getByText("1점")).toBeVisible();
});

test("22번까지 모두 누르면 클리어되고 남은 시간이 더해진다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(page.getByRole("button", { name: "구슬 1" })).toBeVisible({
    timeout: 10_000,
  });

  for (let number = 1; number <= 22; number++) {
    await page.getByRole("button", { name: `구슬 ${number}` }).click();
  }

  await expect(page.getByText("클리어!")).toBeVisible();
  await expect(page.getByText(/구슬 22 \+ 남은 시간 \d+/)).toBeVisible();
});

test("결과 캡쳐를 누르면 점수가 담긴 이미지를 내려받는다", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1" });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });
  await firstMarble.click();
  await page.getByRole("button", { name: "게임 종료" }).click();

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "결과 캡쳐" }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe("marble-game-1.png");
  await download.saveAs(path.join(testInfo.outputDir, "result.png"));
});
