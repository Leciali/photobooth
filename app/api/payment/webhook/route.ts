import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, transaction_status, fraud_status } = body;

    let isSuccess = false;

    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      if (fraud_status === "challenge") {
        isSuccess = false;
      } else {
        isSuccess = true;
      }
    } else if (
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire"
    ) {
      isSuccess = false;
    }

    return NextResponse.json({
      received: true,
      order_id,
      status: transaction_status,
      paid: isSuccess,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid webhook payload" },
      { status: 400 }
    );
  }
}
