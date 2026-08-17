import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === "your-service-role-key") return null;
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ success: false, message: "Belum login" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, message: "SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local" },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ success: false, message: "Belum login" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, message: "SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { name, slug, template_id, price_per_session, is_payment_enabled } = body || {};
  if (!name || !slug) {
    return NextResponse.json({ success: false, message: "name dan slug wajib diisi" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("events")
    .insert([
      {
        name,
        slug,
        owner_id: authData.user.id,
        template_id: template_id || null,
        is_active: true,
        price_per_session: Number(price_per_session) || 25000,
        is_payment_enabled: is_payment_enabled !== false,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}