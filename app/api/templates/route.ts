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
    .from("templates")
    .select("*")
    .eq("owner_id", authData.user.id)
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
  const { name, config } = body || {};
  if (!name || !config) {
    return NextResponse.json(
      { success: false, message: "name dan config wajib diisi" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("templates")
    .insert([{ owner_id: authData.user.id, name, config }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: Request) {
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
  const { id } = body || {};
  if (!id) {
    return NextResponse.json({ success: false, message: "id wajib diisi" }, { status: 400 });
  }

  const { error } = await admin
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("owner_id", authData.user.id);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
