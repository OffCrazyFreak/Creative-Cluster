import { MAP_COLORS } from "../map-colors";

// Drawn at twice the CSS size and registered with pixelRatio 2, so logos stay sharp on dense screens.
export const ICON_PIXEL_RATIO = 2;

// 36 CSS px: above WCAG 2.5.8's 24 px target with room for the logo to read.
const ICON_SIZE = 36 * ICON_PIXEL_RATIO;
const BORDER = 2 * ICON_PIXEL_RATIO;
const TILE_RADIUS = 8 * ICON_PIXEL_RATIO;
const INITIALS_SIZE = 14 * ICON_PIXEL_RATIO;
const FRAME_STROKE = 4 * ICON_PIXEL_RATIO;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Without CORS a cross-origin logo would taint the canvas and getImageData would throw.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function createCanvas(width: number, height = width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  return context;
}

// arcTo rather than roundRect, which Firefox only shipped in 112.
function roundedRect(
  context: CanvasRenderingContext2D,
  inset: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = width - inset;
  const bottom = height - inset;
  context.beginPath();
  context.moveTo(inset + radius, inset);
  context.arcTo(right, inset, right, bottom, radius);
  context.arcTo(right, bottom, inset, bottom, radius);
  context.arcTo(inset, bottom, inset, inset, radius);
  context.arcTo(inset, inset, right, inset, radius);
  context.closePath();
}

function drawTile(draw: (context: CanvasRenderingContext2D) => void) {
  const context = createCanvas(ICON_SIZE);
  roundedRect(context, BORDER / 2, ICON_SIZE, ICON_SIZE, TILE_RADIUS);
  context.fillStyle = MAP_COLORS.tileFill;
  context.fill();
  context.save();
  roundedRect(context, BORDER, ICON_SIZE, ICON_SIZE, TILE_RADIUS - BORDER / 2);
  context.clip();
  draw(context);
  context.restore();
  roundedRect(context, BORDER / 2, ICON_SIZE, ICON_SIZE, TILE_RADIUS);
  context.lineWidth = BORDER;
  context.strokeStyle = MAP_COLORS.tileRim;
  context.stroke();
  // Throws a SecurityError on a tainted canvas; the caller keeps the initials tile then.
  return context.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

// The page's own font, so the tile follows the theme without naming a family here.
export function renderInitialsTile(initials: string): ImageData {
  const font = getComputedStyle(document.body).fontFamily;
  return drawTile((context) => {
    context.font = `600 ${INITIALS_SIZE}px ${font}`;
    context.fillStyle = MAP_COLORS.tileText;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initials, ICON_SIZE / 2, ICON_SIZE / 2);
  });
}

export async function renderLogoTile(src: string): Promise<ImageData> {
  const logo = await loadImage(src);
  return drawTile((context) => {
    const inner = ICON_SIZE - BORDER * 2;
    const scale = Math.min(inner / logo.width, inner / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    const x = (ICON_SIZE - width) / 2;
    context.drawImage(logo, x, (ICON_SIZE - height) / 2, width, height);
  });
}

// The rounded square around the selected entry; a cluster gets a wider one that fits its stack.
export function renderSelectedFrame(wide: boolean): ImageData {
  const width = (wide ? 68 : 48) * ICON_PIXEL_RATIO;
  const height = (wide ? 52 : 48) * ICON_PIXEL_RATIO;
  const context = createCanvas(width, height);
  roundedRect(context, FRAME_STROKE / 2, width, height, 12 * ICON_PIXEL_RATIO);
  context.lineWidth = FRAME_STROKE;
  context.strokeStyle = MAP_COLORS.selected;
  context.stroke();
  return context.getImageData(0, 0, width, height);
}
