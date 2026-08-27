import {
  BOARD_COLS,
  BOARD_ROWS,
  type LuckyMarble,
  type Marble,
} from "./game-rules";

const HEX_WIDTH = 68;
const HEX_HEIGHT = HEX_WIDTH * 1.1547;
const HEX_GAP = 6;
const ROW_STEP = HEX_HEIGHT - HEX_WIDTH * 0.2;
const ROW_OFFSET = (HEX_WIDTH + HEX_GAP) / 2;

const BOARD_PADDING = 28;
const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 92;

const GRID_WIDTH = BOARD_COLS * HEX_WIDTH + (BOARD_COLS - 1) * HEX_GAP + ROW_OFFSET;
const GRID_HEIGHT = HEX_HEIGHT + (BOARD_ROWS - 1) * ROW_STEP;

const CANVAS_WIDTH = GRID_WIDTH + BOARD_PADDING * 2;
const CANVAS_HEIGHT = HEADER_HEIGHT + GRID_HEIGHT + BOARD_PADDING * 2 + FOOTER_HEIGHT;

const FONT_STACK =
  '"DM Sans", ui-sans-serif, system-ui, "Segoe UI", "Malgun Gothic", sans-serif';

function tilePosition(tileIndex: number) {
  const row = Math.floor(tileIndex / BOARD_COLS);
  const col = tileIndex % BOARD_COLS;
  return {
    x:
      BOARD_PADDING +
      col * (HEX_WIDTH + HEX_GAP) +
      (row % 2 === 1 ? ROW_OFFSET : 0),
    y: HEADER_HEIGHT + BOARD_PADDING + row * ROW_STEP,
  };
}

function traceHexagon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  const w = HEX_WIDTH;
  const h = HEX_HEIGHT;
  context.beginPath();
  context.moveTo(x + w / 2, y);
  context.lineTo(x + w, y + h * 0.25);
  context.lineTo(x + w, y + h * 0.75);
  context.lineTo(x + w / 2, y + h);
  context.lineTo(x, y + h * 0.75);
  context.lineTo(x, y + h * 0.25);
  context.closePath();
}

function drawMarble(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  label: string
) {
  const radius = (HEX_WIDTH * 0.64) / 2;

  const gradient = context.createRadialGradient(
    centerX - radius * 0.35,
    centerY - radius * 0.45,
    radius * 0.1,
    centerX,
    centerY,
    radius
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.16, "#cfe0ff");
  gradient.addColorStop(0.5, "#6f8bf5");
  gradient.addColorStop(0.78, "#3b4fd0");
  gradient.addColorStop(1, "#2233a3");

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(HEX_WIDTH * 0.29)}px ${FONT_STACK}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, centerX, centerY + 1);
}

/** 행운 구슬은 무지개 색상환으로 칠하고 가운데 별을 얹는다. */
function drawLuckyMarble(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number
) {
  const radius = (HEX_WIDTH * 0.64) / 2;
  const colors = [
    "#ff5f6d",
    "#ffb36b",
    "#fff07a",
    "#6bffb0",
    "#5ecbff",
    "#9b8bff",
    "#ff7ae0",
  ];

  colors.forEach((color, index) => {
    const start = (index / colors.length) * Math.PI * 2 - Math.PI / 2;
    const end = ((index + 1) / colors.length) * Math.PI * 2 - Math.PI / 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, radius, start, end);
    context.closePath();
    context.fillStyle = color;
    context.fill();
  });

  const gloss = context.createRadialGradient(
    centerX - radius * 0.35,
    centerY - radius * 0.45,
    radius * 0.05,
    centerX,
    centerY,
    radius
  );
  gloss.addColorStop(0, "rgba(255,255,255,0.95)");
  gloss.addColorStop(0.2, "rgba(255,255,255,0.3)");
  gloss.addColorStop(0.55, "rgba(255,255,255,0)");
  gloss.addColorStop(1, "rgba(0,0,0,0.28)");

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = gloss;
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(HEX_WIDTH * 0.3)}px ${FONT_STACK}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("★", centerX, centerY + 1);
}

/** 남은 구슬이 놓인 판과 점수를 한 장에 담는다. */
export function renderResultImage({
  marbles,
  lucky,
  score,
  cleared,
  scoreNote,
}: {
  marbles: Marble[];
  lucky: LuckyMarble | null;
  score: number;
  cleared: boolean;
  scoreNote: string;
}): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = CANVAS_WIDTH * ratio;
  canvas.height = CANVAS_HEIGHT * ratio;

  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.scale(ratio, ratio);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = "#0f1720";
  context.font = `600 20px ${FONT_STACK}`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText("오늘도 구슬에 털림💀", BOARD_PADDING, HEADER_HEIGHT / 2 + 4);

  const boardTop = HEADER_HEIGHT;
  const boardHeight = GRID_HEIGHT + BOARD_PADDING * 2;
  const boardGradient = context.createLinearGradient(
    0,
    boardTop,
    CANVAS_WIDTH,
    boardTop + boardHeight
  );
  boardGradient.addColorStop(0, "#eef8fe");
  boardGradient.addColorStop(1, "#d5eaf7");
  context.fillStyle = boardGradient;
  context.fillRect(0, boardTop, CANVAS_WIDTH, boardHeight);

  for (let tileIndex = 0; tileIndex < BOARD_ROWS * BOARD_COLS; tileIndex++) {
    const { x, y } = tilePosition(tileIndex);
    const tileGradient = context.createLinearGradient(x, y, x + HEX_WIDTH, y + HEX_HEIGHT);
    tileGradient.addColorStop(0, "#fbfeff");
    tileGradient.addColorStop(0.52, "#e4f2fb");
    tileGradient.addColorStop(1, "#cbe4f4");
    traceHexagon(context, x, y);
    context.fillStyle = tileGradient;
    context.fill();
  }

  for (const marble of marbles) {
    const { x, y } = tilePosition(marble.tileIndex);
    drawMarble(context, x + HEX_WIDTH / 2, y + HEX_HEIGHT / 2, String(marble.number));
  }

  if (lucky) {
    const { x, y } = tilePosition(lucky.tileIndex);
    drawLuckyMarble(context, x + HEX_WIDTH / 2, y + HEX_HEIGHT / 2);
  }

  const footerTop = boardTop + boardHeight;
  context.fillStyle = "#ffffff";
  context.fillRect(0, footerTop, CANVAS_WIDTH, FOOTER_HEIGHT);

  // 구슬 숫자를 가운데 정렬로 그린 뒤이므로 정렬을 되돌린다.
  context.textAlign = "left";
  context.fillStyle = cleared ? "#3b4fd0" : "#c8372d";
  context.font = `600 15px ${FONT_STACK}`;
  context.fillText(
    cleared ? "클리어!" : "게임 종료",
    BOARD_PADDING,
    footerTop + 28
  );

  context.fillStyle = "#0f1720";
  context.font = `700 34px ${FONT_STACK}`;
  context.fillText(`${score}점`, BOARD_PADDING, footerTop + 62);

  context.fillStyle = "#5b6b78";
  context.font = `400 14px ${FONT_STACK}`;
  context.textAlign = "right";
  context.fillText(scoreNote, CANVAS_WIDTH - BOARD_PADDING, footerTop + 62);

  return canvas;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export async function downloadResultImage(
  canvas: HTMLCanvasElement,
  score: number
): Promise<boolean> {
  const blob = await toBlob(canvas);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `marble-game-${score}.png`;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function copyResultImage(
  canvas: HTMLCanvasElement
): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    return false;
  }

  const blob = await toBlob(canvas);
  if (!blob) return false;

  try {
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}
