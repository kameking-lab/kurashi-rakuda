import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/app/lib/site";

/**
 * OGP画像の共通生成（next/og、ビルド時静的生成）。
 * ブランドトークン（globals.css）と同じ砂色×深緑・低彩度で、煽り要素を持たない。
 */

export const OG_SIZE = { width: 1200, height: 630 };

let fontCache: Buffer | null = null;

function loadFont(): Buffer {
  if (!fontCache) {
    fontCache = readFileSync(
      join(process.cwd(), "assets", "fonts", "NotoSansJP-Bold-subset.otf"),
    );
  }
  return fontCache;
}

export function ogImage({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f4eee3",
          padding: 64,
          fontFamily: "NotoSansJP",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: title.length > 24 ? 56 : 64,
              lineHeight: 1.35,
              color: "#2f2c26",
              fontWeight: 700,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                marginTop: 24,
                fontSize: 32,
                color: "#6e675c",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "3px solid #2e5039",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 36, color: "#2e5039", fontWeight: 700 }}>
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 26, color: "#7a5f3e" }}>
            無料・登録不要・広告に邪魔されない
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        {
          name: "NotoSansJP",
          data: loadFont(),
          weight: 700,
          style: "normal",
        },
      ],
    },
  );
}
