import { ImageResponse } from "next/og";
import { LogoMark } from "@/lib/app-icon-mark";

// Maskable icons must fill the full canvas with an opaque background and keep
// the glyph inside the ~80%-diameter safe-zone circle the OS mask won't crop —
// a bigger inset than the "any"-purpose icons above.
export async function GET() {
  return new ImageResponse(<LogoMark inset={0.2} />, {
    width: 512,
    height: 512,
  });
}
