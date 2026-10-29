import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Nullworx — an experimental library of procedural visual effects. Prelaunch.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [serif, serifItalic, mono] = await Promise.all([
    readFile(path.join(process.cwd(), "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff")),
    readFile(path.join(process.cwd(), "node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff")),
    readFile(path.join(process.cwd(), "node_modules/@fontsource/space-mono/files/space-mono-latin-400-normal.woff")),
  ]);

  const ascii = [
    " .:-+*=%@# .:-+*=%@# .:-+*=%@# .:-+*=%@# .:-+*=%@#",
    " %@# .:-+*=  .:-+*=%@#  %@# .:-+*=  .:-+*=%@#  %@#",
    "  .:-+*=%@#   .:-+*=%@#   .:-+*=%@#   .:-+*=%@#",
    " %@# .:-+*=%@# .:-+*=%@# .:-+*=%@# .:-+*=%@# .:-",
  ].join("\n");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#090a08",
          color: "#f1eddf",
          fontFamily: "Space Mono",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(241,237,223,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(241,237,223,0.07) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -160,
            top: -250,
            width: 820,
            height: 820,
            borderRadius: 410,
            display: "flex",
            background: "radial-gradient(circle, rgba(216,255,74,0.17), rgba(216,255,74,0))",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 52,
            top: 78,
            width: 260,
            height: 360,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            color: "rgba(216,255,74,0.38)",
            fontSize: 20,
            lineHeight: 1.7,
            letterSpacing: 3,
            whiteSpace: "pre",
          }}
        >
          {ascii}
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "52px 62px 46px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 29,
                    height: 29,
                    border: "1px solid rgba(241,237,223,0.55)",
                    borderRadius: 15,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    display: "flex",
                    width: 34,
                    height: 2,
                    backgroundColor: "#d8ff4a",
                    transform: "rotate(-45deg)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    display: "flex",
                    width: 5,
                    height: 5,
                    backgroundColor: "#d8ff4a",
                  }}
                />
              </div>
              <div style={{ display: "flex", fontSize: 24, letterSpacing: -1 }}>nullworx</div>
            </div>
            <div style={{ display: "flex", fontSize: 12, letterSpacing: 2, color: "#9b988b" }}>
              EXPERIMENTAL EFFECT LIBRARY / V0.1
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 104 }}>
            <div style={{ display: "flex", fontSize: 13, letterSpacing: 3, color: "#d8ff4a" }}>
              FIELD NOTES FROM THE WEB&apos;S UNSTABLE EDGE
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 28,
                fontFamily: "Instrument Serif",
                fontSize: 112,
                lineHeight: 0.86,
                letterSpacing: -4,
              }}
            >
              <span>Effects with</span>
              <span style={{ color: "#d8ff4a", fontStyle: "italic" }}>a pulse.</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: "auto",
              paddingTop: 28,
              borderTop: "1px solid rgba(241,237,223,0.22)",
              fontSize: 12,
              letterSpacing: 1.6,
              color: "#9b988b",
            }}
          >
            <span>ASCII FIELDS / LIVING STENCILS / PROCEDURAL MATERIALS</span>
            <span style={{ color: "#f1eddf" }}>NULLLWORX.SITE ↗</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: serifItalic, style: "italic", weight: 400 },
        { name: "Space Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
