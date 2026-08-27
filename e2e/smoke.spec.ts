import path from "node:path";

import { expect, test } from "@playwright/test";

test("게임 화면이 열리고 설명이 먼저 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("점심시간을 즐겁게~");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "점심시간을 즐겁게~",
  );
  await expect(
    page.getByRole("heading", { level: 2, name: "이렇게 하시면 됩니다" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "결과 캡쳐" })).toBeDisabled();
});

test("시작하면 구슬이 나오고 순서대로 누르면 사라진다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });

  await firstMarble.click();
  await expect(firstMarble).toBeHidden();
  await expect(
    page.getByRole("button", { name: "구슬 2", exact: true }),
  ).toBeVisible();
});

test("순서를 틀리면 그 자리에서 끝나고 점수가 나온다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "구슬 3", exact: true }).click();

  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다."),
  ).toBeVisible();
  await expect(page.getByText("0점")).toBeVisible();
  await expect(page.getByRole("button", { name: "결과 캡쳐" })).toBeEnabled();
});

test("구슬이 5개를 넘으면 다음에 누를 구슬만 강조된다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  // 1단계 구슬은 3개뿐이라 아직 아무 구슬도 강조되지 않는다.
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("[data-next]")).toHaveCount(0);

  // 2초가 지나 4~7번이 얹히면 화면 구슬은 7개가 되고, 1번만 강조된다.
  await expect(
    page.getByRole("button", { name: "구슬 7", exact: true }),
  ).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.locator("[data-next]")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toHaveAttribute("data-next", "");

  // 하나 누르면 강조도 다음 번호로 옮겨간다.
  await page.getByRole("button", { name: "구슬 1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "구슬 2", exact: true }),
  ).toHaveAttribute("data-next", "");
});

test("구슬 그림 바깥을 눌러도 그 구슬을 누른 것으로 친다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });

  // 구슬 그림의 위쪽 가장자리 바로 바깥, 타일 안쪽을 노린다.
  const circle = (await firstMarble.locator("span").boundingBox())!;
  await page.mouse.click(circle.x + circle.width / 2, circle.y - 6);

  await expect(firstMarble).toBeHidden();
  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다."),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "구슬 2", exact: true }),
  ).toBeVisible();
});

test("행운 구슬은 한 판에 딱 한 번 나오고, 순서와 상관없이 눌러 10점을 얻는다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const lucky = page.locator("[data-lucky]");
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });

  // 1·2단계에는 나오지 않는다.
  await expect(lucky).toHaveCount(0);

  // 3~5단계 어딘가에서 딱 하나 나타난다. 5단계에 걸리면 8초 뒤이므로 넉넉히 기다린다.
  await expect(lucky).toHaveCount(1, { timeout: 12_000 });

  // 아직 1번도 누르지 않았는데도 눌린다. 다음 순번은 그대로 1번이다.
  await lucky.click();
  await expect(lucky).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible();

  // 남은 단계가 다 나와도 두 번째 행운 구슬은 없다.
  await expect(
    page.getByRole("button", { name: "구슬 22", exact: true }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(lucky).toHaveCount(0);

  await page.getByRole("button", { name: "게임 종료" }).click();
  await expect(page.getByText("10점")).toBeVisible();
  await expect(page.getByText(/행운 10/)).toBeVisible();
});

test("행운 구슬을 누르지 않고 끝내면 보너스가 붙지 않는다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("[data-lucky]")).toHaveCount(1, {
    timeout: 12_000,
  });

  await page.getByRole("button", { name: "게임 종료" }).click();
  await expect(page.getByText("0점")).toBeVisible();
  await expect(page.getByText(/행운/)).toBeHidden();
});

test("구슬이 없는 자리를 누르면 그 자리에서 끝난다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });
  await firstMarble.click();

  await page.getByTestId("game-board").click({ position: { x: 8, y: 8 } });

  await expect(
    page.getByText("순서에 맞지 않는 곳을 눌렀습니다."),
  ).toBeVisible();
  await expect(page.getByText("1점")).toBeVisible();
});

test("22번까지 모두 누르면 클리어되고 남은 시간이 더해진다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();
  await expect(
    page.getByRole("button", { name: "구슬 1", exact: true }),
  ).toBeVisible({
    timeout: 10_000,
  });

  for (let number = 1; number <= 22; number++) {
    await page
      .getByRole("button", { name: `구슬 ${number}`, exact: true })
      .click();
  }

  await expect(page.getByText("클리어!")).toBeVisible();
  await expect(page.getByText(/구슬 22 \+ 남은 시간 \d+/)).toBeVisible();
});

test("결과 캡쳐를 누르면 점수가 담긴 이미지를 내려받는다", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "게임 시작" }).click();

  const firstMarble = page.getByRole("button", { name: "구슬 1", exact: true });
  await expect(firstMarble).toBeVisible({ timeout: 10_000 });
  await firstMarble.click();
  await page.getByRole("button", { name: "게임 종료" }).click();

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "결과 캡쳐" }).click();
  const download = await downloading;

  expect(download.suggestedFilename()).toBe("marble-game-1.png");
  await download.saveAs(path.join(testInfo.outputDir, "result.png"));
});
