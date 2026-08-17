export type KioskLayout = "grid" | "diptych" | "single";

const PRINT_WIDTH_PX = 1800; // 6 inch @ 300 DPI
const PRINT_HEIGHT_PX = 1200; // 4 inch @ 300 DPI

interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  slot: Slot
) {
  const iw = (img as HTMLCanvasElement).width || 1280;
  const ih = (img as HTMLCanvasElement).height || 720;
  const scale = Math.max(slot.w / iw, slot.h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = slot.x + (slot.w - dw) / 2;
  const dy = slot.y + (slot.h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function getSlots(layout: KioskLayout, margin: number, gutter: number): Slot[] {
  const innerW = PRINT_WIDTH_PX - margin * 2;
  const innerH = PRINT_HEIGHT_PX - margin * 2 - 110; // reserve footer area

  if (layout === "single") {
    return [{ x: margin, y: margin, w: innerW, h: innerH }];
  }

  if (layout === "diptych") {
    const w = (innerW - gutter) / 2;
    return [
      { x: margin, y: margin, w, h: innerH },
      { x: margin + w + gutter, y: margin, w, h: innerH },
    ];
  }

  // grid 2x2
  const w = (innerW - gutter) / 2;
  const h = (innerH - gutter) / 2;
  return [
    { x: margin, y: margin, w, h },
    { x: margin + w + gutter, y: margin, w, h },
    { x: margin, y: margin + h + gutter, w, h },
    { x: margin + w + gutter, y: margin + h + gutter, w, h },
  ];
}

async function loadCanvas(src: string | HTMLCanvasElement): Promise<HTMLCanvasElement> {
  if (typeof src !== "string") return src;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export async function renderComposite(
  photos: Array<string | HTMLCanvasElement>,
  layout: KioskLayout,
  eventName: string,
  overlayUrl?: string | null
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = PRINT_WIDTH_PX;
  canvas.height = PRINT_HEIGHT_PX;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PRINT_WIDTH_PX, PRINT_HEIGHT_PX);

  const margin = 60;
  const gutter = 40;
  const slots = getSlots(layout, margin, gutter);
  const used = Math.min(slots.length, photos.length);

  // Load all images first (fill missing slots with light placeholder)
  const loaded: Array<HTMLCanvasElement | null> = [];
  for (let i = 0; i < used; i++) {
    try {
      loaded.push(await loadCanvas(photos[i]));
    } catch {
      loaded.push(null);
    }
  }

  slots.slice(0, used).forEach((slot, i) => {
    const img = loaded[i];
    if (img) {
      coverDraw(ctx, img, slot);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    } else {
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
  });

  // Brand footer
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 42px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("photobooth", PRINT_WIDTH_PX / 2, PRINT_HEIGHT_PX - 40);

  if (eventName) {
    ctx.fillStyle = "#64748b";
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText(eventName, PRINT_WIDTH_PX / 2, PRINT_HEIGHT_PX - 85);
  }

  // Frame overlay (full-bleed PNG, transparent center) drawn on top
  if (overlayUrl) {
    try {
      const overlay = await loadCanvas(overlayUrl);
      // Cover-fit the overlay to the full canvas
      const scale = Math.max(
        PRINT_WIDTH_PX / overlay.width,
        PRINT_HEIGHT_PX / overlay.height
      );
      const w = overlay.width * scale;
      const h = overlay.height * scale;
      ctx.drawImage(
        overlay,
        (PRINT_WIDTH_PX - w) / 2,
        (PRINT_HEIGHT_PX - h) / 2,
        w,
        h
      );
    } catch {
      // Overlay failed to load — continue without it
    }
  }

  return canvas.toDataURL("image/png");
}
