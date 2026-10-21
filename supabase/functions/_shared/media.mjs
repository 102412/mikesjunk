import { HttpError } from './research.mjs';
export function sanitizeJPEG(bytes, codec) {
  if (bytes.byteLength > 8388608) throw new HttpError(413, 'Images must be under 8 MB.');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new HttpError(400, 'A JPEG image is required.');
  let image;
  try { image = codec.decode(bytes, { useTArray: true, maxResolutionInMP: 8, maxMemoryUsageInMB: 64, tolerantDecoding: false }); }
  catch { throw new HttpError(400, 'Image could not be decoded safely.'); }
  if (image.width > 4096 || image.height > 4096) throw new HttpError(400, 'Resize to at most 4,096 pixels per side.');
  return codec.encode(image, 85).data;
}
