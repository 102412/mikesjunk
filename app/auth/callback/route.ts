import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/builder?auth=complete";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const destination = new URL(safeNext(request.nextUrl.searchParams.get("next")), request.nextUrl.origin);

  if (!code || !url || !key) {
    destination.searchParams.set("auth", "error");
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(destination);
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) { values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) destination.searchParams.set("auth", "error");
  return error ? NextResponse.redirect(destination) : response;
}
