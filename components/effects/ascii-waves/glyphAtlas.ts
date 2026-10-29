const FONT_STACK = `"DejaVu Sans Mono", "Liberation Mono", "Nimbus Mono PS", monospace`;
const PAD = 2;

export interface GlyphAtlas {
  texture: WebGLTexture;
  columns: number;
  cellCssPx: number;
  dpr: number;
  /**
   * Normalized size of the central content box inside one atlas slot, and
   * the normalized padding before it. The shader uses these to sample a glyph
   * without pulling ink from a neighbouring slot.
   */
  inner: number;
  pad: number;
  slotPx: number;
}

/**
 * Raster each glyph at the cell's real device-pixel size. Drawing a large
 * atlas and minifying it erased the thin strokes of punctuation; a native-size
 * atlas keeps '+' and ':' crisp at every DPR. Each slot has a transparent
 * pad so linear filtering has nothing to bleed into.
 */
export function createGlyphAtlas(
  gl: WebGL2RenderingContext,
  characters: string,
  cellCssPx: number,
  dpr: number,
): GlyphAtlas {
  const glyphs = Array.from(characters).slice(0, 48);
  const columns = Math.max(1, glyphs.length);
  const cellPx = Math.max(6, Math.round(cellCssPx * dpr));
  const slotPx = cellPx + PAD * 2;
  const fontPx = Math.max(9, cellPx * 0.94);
  const canvas = document.createElement("canvas");
  canvas.width = columns * slotPx;
  canvas.height = slotPx;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("2D canvas is unavailable for the glyph atlas.");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontPx}px ${FONT_STACK}`;
  ctx.imageSmoothingEnabled = true;

  glyphs.forEach((char, index) => {
    if (char === ` ` || char === String.fromCharCode(0xa0)) return;
    const centerX = index * slotPx + PAD + cellPx / 2;
    const centerY = PAD + cellPx / 2;
    ctx.fillText(char, centerX, centerY + fontPx * 0.015);
  });

  const texture = gl.createTexture();
  if (!texture) throw new Error("Could not allocate the glyph atlas texture.");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    columns,
    cellCssPx,
    dpr,
    inner: cellPx / slotPx,
    pad: PAD / slotPx,
    slotPx,
  };
}
