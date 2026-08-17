import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageDataUrl, filename, folder } = body;

    if (!imageDataUrl) {
      return NextResponse.json(
        { success: false, message: "imageDataUrl is required" },
        { status: 400 }
      );
    }

    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
    const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2PublicUrl = process.env.R2_PUBLIC_URL;

    // Only use R2 when real keys are configured (not placeholder values)
    const hasRealR2 =
      r2AccountId &&
      r2AccessKey &&
      r2SecretKey &&
      r2PublicUrl &&
      !r2AccountId.startsWith("your-") &&
      !r2AccessKey.startsWith("your-") &&
      !r2SecretKey.startsWith("your-") &&
      !r2PublicUrl.startsWith("https://cdn.yourdomain");

    if (hasRealR2) {
      const publicFileUrl = `${r2PublicUrl}/${folder || "sessions"}/${filename || `img-${Date.now()}.png`}`;

      return NextResponse.json({
        success: true,
        url: publicFileUrl,
        filename,
      });
    }

    // Default fast fallback: return data URL / local asset reference during initial local testing
    return NextResponse.json({
      success: true,
      url: imageDataUrl, // Data URL or cached object URL
      filename: filename || `composite-${Date.now()}.png`,
      isLocalFallback: true,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal mengunggah gambar" },
      { status: 500 }
    );
  }
}
