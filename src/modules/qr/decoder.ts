import jsQR from 'jsqr';
import { Jimp } from 'jimp';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('qrDecoder');

export interface QRDecodeResult {
  success: boolean;
  content?: string;
  error?: string;
}

export async function decodeQRFromBuffer(buffer: Buffer): Promise<QRDecodeResult> {
  try {
    const image = await Jimp.read(buffer);

    const width = image.width;
    const height = image.height;

    const imageData = new Uint8ClampedArray(width * height * 4);

    let idx = 0;
    image.scan(0, 0, width, height, function (x, y, pixelIdx) {
      const pixel = Jimp.intToRGBA(this.getPixelColor(x, y));
      imageData[idx++] = pixel.r;
      imageData[idx++] = pixel.g;
      imageData[idx++] = pixel.b;
      imageData[idx++] = pixel.a;
    });

    const code = jsQR(imageData, width, height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code) {
      logger.debug({ contentLength: code.data.length }, 'QR code decoded');
      return {
        success: true,
        content: code.data,
      };
    }

    return {
      success: false,
      error: 'No QR code found in image',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn({ error: errorMessage }, 'QR decode error');

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function decodeMultipleQR(buffers: Buffer[]): Promise<QRDecodeResult[]> {
  const results = await Promise.all(buffers.map(decodeQRFromBuffer));
  return results;
}
