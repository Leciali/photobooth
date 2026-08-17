import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, sessionCode, eventName } = body;

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/gallery/${sessionCode}`;

    if (resendApiKey) {
      const emailPayload = {
        from: process.env.EMAIL_FROM || "photobooth <noreply@photobooth.app>",
        to: [email],
        subject: `📸 Foto Kenangan Anda di ${eventName || "photobooth"}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0f172a; font-size: 24px; margin-bottom: 8px;">photobooth.</h1>
              <p style="color: #64748b; font-size: 14px;">Terima kasih telah berfoto bersama kami di ${eventName || "Acara Spektakuler"}!</p>
            </div>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; margin-bottom: 24px;">
              <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Foto & GIF Anda Sudah Siap</h2>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Klik tombol di bawah ini untuk melihat dan mengunduh berkas kualitas tinggi Anda:</p>
              
              <a href="${galleryUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px;">
                Buka Galeri Foto Digital Anda
              </a>
            </div>

            <div style="text-align: center; color: #94a3b8; font-size: 12px;">
              Tautan galeri ini akan berlaku selama 72 jam.
            </div>
          </div>
        `,
      };

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(emailPayload),
      });

      const resendData = await resendRes.json();

      return NextResponse.json({
        success: true,
        emailSent: true,
        data: resendData,
      });
    }

    // Default simulation response when API key is not configured
    return NextResponse.json({
      success: true,
      emailSent: true,
      simulated: true,
      email,
      galleryUrl,
      message: "Email dispatch simulated successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal mengirimkan email" },
      { status: 500 }
    );
  }
}
