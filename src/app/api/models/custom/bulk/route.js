import { NextResponse } from "next/server";
import { bulkAddCustomModels } from "@/models";
import { CAPACITY_META, isSttTransport } from "@/shared/constants/models";

export const dynamic = "force-dynamic";

// Whitelist capability keys to boolean values — ignore anything else
function sanitizeCaps(caps) {
  if (!caps || typeof caps !== "object") return null;
  const clean = {};
  for (const key of Object.keys(CAPACITY_META)) {
    if (typeof caps[key] === "boolean") clean[key] = caps[key];
  }
  return Object.keys(clean).length ? clean : null;
}

// Accepted STT transport markers live in the shared whitelist
// (src/shared/constants/models STT_TRANSPORT_META) — the dashboard transport
// select and this validator must agree on one set, so neither owns a copy.
// Unknown or mistyped values are silently dropped, the same policy
// sanitizeCaps applies to capability keys.
function sanitizeTransport(transport, type) {
  if (type !== "stt" || !isSttTransport(transport)) return null;
  return transport.trim();
}

// POST /api/models/custom/bulk - Add many custom models in one transaction
export async function POST(request) {
  try {
    const { models } = await request.json();
    if (!Array.isArray(models) || models.length === 0) {
      return NextResponse.json({ error: "models array required" }, { status: 400 });
    }
    const cleaned = models
      .filter((m) => m && typeof m === "object" && m.providerAlias && m.id)
      .map((m) => {
        const cleanCaps = sanitizeCaps(m.caps);
        const cleanTransport = sanitizeTransport(m.transport, m.type || "llm");
        return {
          providerAlias: m.providerAlias,
          id: m.id,
          type: m.type || "llm",
          name: m.name,
          ...(cleanCaps ? { caps: cleanCaps } : {}),
          ...(cleanTransport ? { transport: cleanTransport } : {}),
        };
      });
    const result = await bulkAddCustomModels({ models: cleaned });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.log("Error bulk adding custom models:", error);
    return NextResponse.json({ error: "Failed to bulk add custom models" }, { status: 500 });
  }
}
