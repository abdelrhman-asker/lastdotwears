import { inspectImage } from './image-metadata.util.js';

describe('inspectImage', () => {
  it('reads PNG dimensions', () => {
    const buffer = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(640, 16);
    buffer.writeUInt32BE(480, 20);
    expect(inspectImage(buffer)).toEqual({ format: 'png', width: 640, height: 480 });
  });

  it('reads JPEG dimensions', () => {
    const buffer = Buffer.alloc(21);
    buffer.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80]);
    expect(inspectImage(buffer)).toEqual({ format: 'jpeg', width: 640, height: 480 });
  });

  it('reads extended WebP dimensions', () => {
    const buffer = Buffer.alloc(30);
    buffer.write('RIFF', 0, 'ascii');
    buffer.write('WEBP', 8, 'ascii');
    buffer.write('VP8X', 12, 'ascii');
    buffer.writeUIntLE(639, 24, 3);
    buffer.writeUIntLE(479, 27, 3);
    expect(inspectImage(buffer)).toEqual({ format: 'webp', width: 640, height: 480 });
  });

  it('reads AVIF spatial extents', () => {
    const buffer = Buffer.alloc(36);
    buffer.write('ftyp', 4, 'ascii');
    buffer.write('avif', 8, 'ascii');
    buffer.writeUInt32BE(20, 16);
    buffer.write('ispe', 20, 'ascii');
    buffer.writeUInt32BE(640, 28);
    buffer.writeUInt32BE(480, 32);
    expect(inspectImage(buffer)).toEqual({ format: 'avif', width: 640, height: 480 });
  });

  it('rejects malformed content', () => {
    expect(inspectImage(Buffer.from('not an image'))).toBeNull();
  });
});
