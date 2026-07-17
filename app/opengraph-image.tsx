import { ogImage, OG_SIZE } from "@/app/lib/og";
import { SITE_TAGLINE } from "@/app/lib/site";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "くらしのラクダ";

/** サイト既定のOGP画像 */
export default function Image() {
  return ogImage({
    title: "毎日の「調べもの」を、その場で解決。",
    subtitle: SITE_TAGLINE,
  });
}
