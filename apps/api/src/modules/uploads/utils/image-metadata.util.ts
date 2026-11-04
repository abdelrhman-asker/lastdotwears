export const imageContentTypes = {
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export type SupportedImageFormat = keyof typeof imageContentTypes;

export interface ImageMetadata {
  format: SupportedImageFormat;
  width: number;
  height: number;
}

const jpegStartOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function dimensions(
  format: SupportedImageFormat,
  width: number,
  height: number,
): ImageMetadata | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { format, width, height };
}

function pngMetadata(buffer: Buffer): ImageMetadata | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return dimensions('png', buffer.readUInt32BE(16), buffer.readUInt32BE(20));
}

function jpegMetadata(buffer: Buffer): ImageMetadata | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) return null;
    const marker = buffer[offset]!;
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
    if (jpegStartOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      return dimensions('jpeg', buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3));
    }
    offset += segmentLength;
  }
  return null;
}

function webpMetadata(buffer: Buffer): ImageMetadata | null {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    return null;
  }
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') {
    return dimensions('webp', buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1);
  }
  if (chunk === 'VP8L' && buffer[20] === 0x2f) {
    const byte1 = buffer[21]!;
    const byte2 = buffer[22]!;
    const byte3 = buffer[23]!;
    const byte4 = buffer[24]!;
    return dimensions(
      'webp',
      1 + (((byte2 & 0x3f) << 8) | byte1),
      1 + (((byte4 & 0x0f) << 10) | (byte3 << 2) | ((byte2 & 0xc0) >> 6)),
    );
  }
  if (chunk === 'VP8 ' && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return dimensions('webp', buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff);
  }
  return null;
}

function avifMetadata(buffer: Buffer): ImageMetadata | null {
  if (
    buffer.length < 28 ||
    buffer.subarray(4, 8).toString('ascii') !== 'ftyp' ||
    !['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii'))
  ) {
    return null;
  }
  for (let offset = 4; offset + 16 <= buffer.length; offset += 1) {
    if (buffer.subarray(offset, offset + 4).toString('ascii') !== 'ispe') continue;
    const boxStart = offset - 4;
    const boxSize = buffer.readUInt32BE(boxStart);
    if (boxSize < 20 || boxStart + boxSize > buffer.length) continue;
    return dimensions('avif', buffer.readUInt32BE(offset + 8), buffer.readUInt32BE(offset + 12));
  }
  return null;
}

export function inspectImage(buffer: Buffer): ImageMetadata | null {
  return (
    pngMetadata(buffer) ?? jpegMetadata(buffer) ?? webpMetadata(buffer) ?? avifMetadata(buffer)
  );
}
