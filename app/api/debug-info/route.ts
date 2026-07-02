import { NextResponse } from "next/server";
import { getHotelInfo } from "@/lib/services/live-rates";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") || "Le Meurice";
  const city = searchParams.get("city") || "Paris";
  const t0 = Date.now();
  const info = await getHotelInfo(name, city);
  return NextResponse.json({
    name,
    city,
    ms: Date.now() - t0,
    gotInfo: Boolean(info),
    amenities: info?.amenities.length ?? 0,
    restaurants: info?.restaurants ?? [],
    hasTax: Boolean(info?.tax),
  });
}
