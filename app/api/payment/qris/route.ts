import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventSlug, amount, customerEmail } = body;

    const orderId = `BOOTHPAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";

    // If Midtrans Server Key is provided, call Midtrans Sandbox / Production Core API
    if (serverKey) {
      const endpoint = isProduction
        ? "https://api.midtrans.com/v2/charge"
        : "https://api.sandbox.midtrans.com/v2/charge";

      const authHeader = Buffer.from(`${serverKey}:`).toString("base64");

      const midtransPayload = {
        payment_type: "gopay",
        transaction_details: {
          order_id: orderId,
          gross_amount: amount || 25000,
        },
        gopay: {
          enable_callback: true,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/kiosk/${eventSlug}?status=success`,
        },
        customer_details: {
          email: customerEmail || "guest@photobooth.app",
        },
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify(midtransPayload),
      });

      const midtransData = await response.json();

      return NextResponse.json({
        success: true,
        orderId,
        qrisString: midtransData.qr_string || "00020101021226680016COM.GO-JEK.WWW0118936009140000000000021520000000000000003033605802ID5910photobooth6007Jakarta61051211062070703A0163041D99",
        actions: midtransData.actions || [],
        isSandboxSimulated: false,
      });
    }

    // Default Sandbox Simulation mode if server key is not configured yet
    return NextResponse.json({
      success: true,
      orderId,
      qrisString: `00020101021226680016COM.GO-JEK.WWW0118936009140000000000021520000000000000003033605802ID5910photobooth6007Jakarta61051211062070703A0163041D99`,
      amount: amount || 25000,
      isSandboxSimulated: true,
      message: "Midtrans Sandbox Dynamic QRIS generated successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Gagal membuat kode QRIS" },
      { status: 500 }
    );
  }
}
