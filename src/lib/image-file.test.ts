import { describe, expect, it } from 'vitest';
import { pngBytes, toBytes as bytes, u16be, u32be } from '@/test/images';
import { sniffImage } from './image-file';

describe('sniffImage', () => {
  it('reads PNG type and size from the header', () => {
    expect(sniffImage(pngBytes(1200, 630))).toEqual({ mimeType: 'image/png', ext: 'png', width: 1200, height: 630 });
  });

  it('walks JPEG segments to the frame header', () => {
    const jpeg = bytes(
      [0xff, 0xd8],
      [0xff, 0xe0], u16be(16), 'JFIF\0', new Array(9).fill(0),
      [0xff, 0xc0], u16be(17), [8], u16be(480), u16be(640), new Array(12).fill(0),
    );
    expect(sniffImage(jpeg)).toEqual({ mimeType: 'image/jpeg', ext: 'jpg', width: 640, height: 480 });
  });

  it('reads extended WebP canvas sizes', () => {
    const webp = bytes('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', [10, 0, 0, 0], [0, 0, 0, 0], [0x7f, 0x07, 0x00], [0x37, 0x04, 0x00]);
    expect(sniffImage(webp)).toEqual({ mimeType: 'image/webp', ext: 'webp', width: 1920, height: 1080 });
  });

  it('recognizes AVIF without parsing its size', () => {
    expect(sniffImage(bytes(u32be(28), 'ftypavif', u32be(0), 'mif1'))).toEqual({
      mimeType: 'image/avif',
      ext: 'avif',
      width: null,
      height: null,
    });
  });

  it('rejects anything that is not a supported image, whatever it is called', () => {
    expect(sniffImage(bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImage(bytes('<!doctype html><script>alert(1)</script>'))).toBeNull();
    expect(sniffImage(bytes('GIF89a', new Array(20).fill(0)))).toBeNull();
    expect(sniffImage(bytes([0xff, 0xd8]))).toBeNull();
  });
});
