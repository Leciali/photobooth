import QRCode from "qrcode";

export function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 800,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

export function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
