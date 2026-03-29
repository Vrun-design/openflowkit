const GIF_HEADER = 'GIF89a';
const RGB332_PALETTE: Uint8Array = buildRgb332Palette();

function buildRgb332Palette(): Uint8Array {
  const palette = new Uint8Array(256 * 3);
  for (let index = 0; index < 256; index += 1) {
    const red = (((index >> 5) & 0x07) * 255) / 7;
    const green = (((index >> 2) & 0x07) * 255) / 7;
    const blue = ((index & 0x03) * 255) / 3;
    palette[index * 3] = Math.round(red);
    palette[index * 3 + 1] = Math.round(green);
    palette[index * 3 + 2] = Math.round(blue);
  }
  return palette;
}

function stringToBytes(value: string): number[] {
  return [...value].map((char) => char.charCodeAt(0));
}

function pushUint16(buffer: number[], value: number): void {
  buffer.push(value & 0xff, (value >> 8) & 0xff);
}

function clampDelay(delayMs: number): number {
  return Math.max(2, Math.round(delayMs / 10));
}

// ── Quantization ────────────────────────────────────────────────────

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

function findNearestPaletteIndex(r: number, g: number, b: number): number {
  return (
    ((clampByte(r) & 0xe0) | ((clampByte(g) & 0xe0) >> 3) | ((clampByte(b) & 0xc0) >> 6)) & 0xff
  );
}

function quantizeWithDithering(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const out = new Uint8Array(width * height);

  const errR = new Float32Array(width * height);
  const errG = new Float32Array(width * height);
  const errB = new Float32Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const j = i / 4;
    errR[j] = data[i];
    errG[j] = data[i + 1];
    errB[j] = data[i + 2];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const r = clampByte(Math.round(errR[idx]));
      const g = clampByte(Math.round(errG[idx]));
      const b = clampByte(Math.round(errB[idx]));

      out[idx] = findNearestPaletteIndex(r, g, b);

      const paletteIdx = out[idx];
      const pr = RGB332_PALETTE[paletteIdx * 3];
      const pg = RGB332_PALETTE[paletteIdx * 3 + 1];
      const pb = RGB332_PALETTE[paletteIdx * 3 + 2];

      const dr = errR[idx] - pr;
      const dg = errG[idx] - pg;
      const db = errB[idx] - pb;

      if (x + 1 < width) {
        errR[idx + 1] += (dr * 7) / 16;
        errG[idx + 1] += (dg * 7) / 16;
        errB[idx + 1] += (db * 7) / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          errR[idx + width - 1] += (dr * 3) / 16;
          errG[idx + width - 1] += (dg * 3) / 16;
          errB[idx + width - 1] += (db * 3) / 16;
        }
        errR[idx + width] += (dr * 5) / 16;
        errG[idx + width] += (dg * 5) / 16;
        errB[idx + width] += (db * 5) / 16;
        if (x + 1 < width) {
          errR[idx + width + 1] += (dr * 1) / 16;
          errG[idx + width + 1] += (dg * 1) / 16;
          errB[idx + width + 1] += (db * 1) / 16;
        }
      }
    }
  }

  return out;
}

function quantizeFast(imageData: ImageData): Uint8Array {
  const out = new Uint8Array(imageData.width * imageData.height);
  const { data } = imageData;
  for (let pixelIndex = 0; pixelIndex < out.length; pixelIndex += 1) {
    const dataIndex = pixelIndex * 4;
    const red = data[dataIndex];
    const green = data[dataIndex + 1];
    const blue = data[dataIndex + 2];
    out[pixelIndex] = (red & 0xe0) | ((green & 0xe0) >> 3) | ((blue & 0xc0) >> 6);
  }
  return out;
}

// ── LZW Encoder ─────────────────────────────────────────────────────

function lzwEncode(indices: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dictionary = new Map<string, number>();
  for (let index = 0; index < clearCode; index += 1) {
    dictionary.set(String(index), index);
  }

  const codes: number[] = [clearCode];
  let prefix = String(indices[0] ?? 0);

  for (let index = 1; index < indices.length; index += 1) {
    const suffix = String(indices[index]);
    const combined = `${prefix},${suffix}`;
    if (dictionary.has(combined)) {
      prefix = combined;
      continue;
    }

    codes.push(dictionary.get(prefix)!);
    dictionary.set(combined, nextCode);
    nextCode += 1;
    prefix = suffix;

    if (nextCode === 1 << codeSize && codeSize < 12) {
      codeSize += 1;
    }

    if (nextCode >= 4095) {
      codes.push(clearCode);
      dictionary = new Map<string, number>();
      for (let resetIndex = 0; resetIndex < clearCode; resetIndex += 1) {
        dictionary.set(String(resetIndex), resetIndex);
      }
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
    }
  }

  codes.push(dictionary.get(prefix)!);
  codes.push(endCode);

  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  codeSize = minCodeSize + 1;
  nextCode = endCode + 1;

  for (const code of codes) {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;

    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }

    if (code === clearCode) {
      codeSize = minCodeSize + 1;
      nextCode = endCode + 1;
      continue;
    }

    if (code !== endCode) {
      nextCode += 1;
      if (nextCode === 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    }
  }

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return new Uint8Array(output);
}

function chunkSubBlocks(bytes: Uint8Array): number[] {
  const out: number[] = [];
  for (let offset = 0; offset < bytes.length; offset += 255) {
    const chunk = bytes.slice(offset, offset + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
  return out;
}

// ── Public API ──────────────────────────────────────────────────────

export interface GifFrameInput {
  imageData: ImageData;
  delayMs: number;
}

export interface GifStreamHandle {
  addFrame(imageData: ImageData, delayMs: number): void;
  finish(): Blob;
}

export function startGifStream(
  width: number,
  height: number,
  useDithering = true
): GifStreamHandle {
  const bytes: number[] = [];

  bytes.push(...stringToBytes(GIF_HEADER));
  pushUint16(bytes, width);
  pushUint16(bytes, height);
  bytes.push(0xf7, 0x00, 0x00);
  bytes.push(...RGB332_PALETTE);
  bytes.push(0x21, 0xff, 0x0b, ...stringToBytes('NETSCAPE2.0'), 0x03, 0x01, 0x00, 0x00, 0x00);

  const quantize = useDithering ? quantizeWithDithering : quantizeFast;

  return {
    addFrame(imageData: ImageData, delayMs: number) {
      const indexedPixels = quantize(imageData);
      const compressed = lzwEncode(indexedPixels);
      bytes.push(0x21, 0xf9, 0x04, 0x04);
      pushUint16(bytes, clampDelay(delayMs));
      bytes.push(0x00, 0x00);
      bytes.push(0x2c);
      pushUint16(bytes, 0);
      pushUint16(bytes, 0);
      pushUint16(bytes, width);
      pushUint16(bytes, height);
      bytes.push(0x00);
      bytes.push(0x08, ...chunkSubBlocks(compressed));
    },
    finish() {
      bytes.push(0x3b);
      return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
    },
  };
}

export function encodeGif(frames: GifFrameInput[]): Blob {
  if (frames.length === 0) {
    throw new Error('GIF export requires at least one frame.');
  }

  const width = frames[0].imageData.width;
  const height = frames[0].imageData.height;
  const stream = startGifStream(width, height);

  for (const frame of frames) {
    stream.addFrame(frame.imageData, frame.delayMs);
  }

  return stream.finish();
}
