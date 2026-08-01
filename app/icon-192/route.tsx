import { ImageResponse } from "next/og";
import { LogoMark } from "@/lib/app-icon-mark";

export async function GET() {
  return new ImageResponse(<LogoMark inset={0.15} />, {
    width: 192,
    height: 192,
  });
}
