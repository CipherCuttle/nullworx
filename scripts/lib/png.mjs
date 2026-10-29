/**
 * Minimal dependency-free PNG decoder for the G3-A evidence harness.
 *
 * Supports the non-interlaced 8-bit grayscale, RGB, grayscale-alpha and RGBA
 * images that Chromium's screenshot pipeline emits. Returns RGBA bytes so the
 * harness can compare composited pixels without adding a native image library.
 */
import { inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8 || !buffer.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error("Not a PNG buffer");
  }

  let offset = 8;
  let header = null;
  const idat = [];

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  if (!header) throw new Error("PNG has no IHDR");
  if (header.bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${header.bitDepth}`);
  if (header.interlace !== 0) throw new Error("Interlaced PNG is unsupported");
  if (header.compression !== 0 || header.filter !== 0) throw new Error("Unsupported PNG compression");
  const channels = CHANNELS[header.colorType];
  if (!channels) throw new Error(`Unsupported PNG colour type ${header.colorType}`);

  const stride = header.width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const expected = header.height * (stride + 1);
  if (raw.length < expected) throw new Error(`PNG data is short: ${raw.length} < ${expected}`);

  const rows = Buffer.alloc(header.height * stride);
  let source = 0;
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[source];
    source += 1;
    const rowStart = y * stride;
    const previous = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[source];
      source += 1;
      const left = x >= channels ? rows[rowStart + x - channels] : 0;
      const up = y > 0 ? rows[previous + x] : 0;
      const upLeft = x >= channels && y > 0 ? rows[previous + x - channels] : 0;
      let result;
      switch (filter) {
        case 0:
          result = value;
          break;
        case 1:
          result = value + left;
          break;
        case 2:
          result = value + up;
          break;
        case 3:
          result = value + ((left + up) >> 1);
          break;
        case 4:
          result = value + paeth(left, up, upLeft);
          break;
        default:
          throw new Error(`Unsupported PNG row filter ${filter}`);
      }
      rows[rowStart + x] = result & 0xff;
    }
  }

  const rgba = new Uint8Array(header.width * header.height * 4);
  for (let pixel = 0; pixel < header.width * header.height; pixel += 1) {
    const input = pixel * channels;
    const output = pixel * 4;
    if (channels === 4) {
      rgba[output] = rows[input];
      rgba[output + 1] = rows[input + 1];
      rgba[output + 2] = rows[input + 2];
      rgba[output + 3] = rows[input + 3];
    } else if (channels === 3) {
      rgba[output] = rows[input];
      rgba[output + 1] = rows[input + 1];
      rgba[output + 2] = rows[input + 2];
      rgba[output + 3] = 255;
    } else if (channels === 2) {
      const gray = rows[input];
      rgba[output] = gray;
      rgba[output + 1] = gray;
      rgba[output + 2] = gray;
      rgba[output + 3] = rows[input + 1];
    } else {
      const gray = rows[input];
      rgba[output] = gray;
      rgba[output + 1] = gray;
      rgba[output + 2] = gray;
      rgba[output + 3] = 255;
    }
  }

  return { width: header.width, height: header.height, data: rgba };
}

export function pixelAt(image, x, y) {
  const cx = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const index = (cy * image.width + cx) * 4;
  return [image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]];
}

export function channelDelta(a, b) {
  return Math.max(
    Math.abs(a[0] - b[0]),
    Math.abs(a[1] - b[1]),
    Math.abs(a[2] - b[2]),
    Math.abs(a[3] - b[3]),
  );
}
