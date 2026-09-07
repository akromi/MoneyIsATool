import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements, canAccess } from "@/lib/entitlements";
import { stampPdf } from "@/lib/stamp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Protected download. Every request is checked against the signed-in user's
 *  entitlement; nothing here has a public URL. PDFs are stamped with the
 *  licensee's name; other file types are handed out via a one-minute signed
 *  link from the private bucket. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/api/files/${slug}`)}`, request.url));
  }

  const admin = createAdminClient();
  const { data: resource } = await admin.from("resources").select("*").eq("slug", slug).maybeSingle();
  if (!resource) return new NextResponse("Not found", { status: 404 });

  const ent = await getEntitlements(user);
  if (!canAccess(ent, resource.audience)) {
    return NextResponse.redirect(new URL("/account?denied=file", request.url));
  }

  await admin.from("downloads").insert({
    user_id: user.id,
    resource_id: resource.id,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
  });

  const isPdf = /\.pdf$/i.test(resource.file_name);
  if (!isPdf) {
    const { data, error } = await admin.storage.from("resources").createSignedUrl(resource.storage_path, 60, { download: resource.file_name });
    if (error || !data) return new NextResponse("File unavailable", { status: 502 });
    return NextResponse.redirect(data.signedUrl, { status: 302 });
  }

  const { data: blob, error } = await admin.storage.from("resources").download(resource.storage_path);
  if (error || !blob) return new NextResponse("File unavailable", { status: 502 });
  const stamped = await stampPdf(new Uint8Array(await blob.arrayBuffer()), { name: user.fullName, email: user.email });

  return new NextResponse(Buffer.from(stamped), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resource.file_name.replace(/["\r\n]/g, "")}"`,
      "Content-Length": String(stamped.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}
