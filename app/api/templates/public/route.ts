import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "your-service-role-key") {
    return NextResponse.json({ success: false, data: [], message: "key belum diisi" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ success: false, data: [], message: "ownerId wajib diisi" }, { status: 400 });
  }

  const admin = createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("templates")
    .select("id, name, config, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, data: [], message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}