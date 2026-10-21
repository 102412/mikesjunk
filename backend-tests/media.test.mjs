import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { sanitizeJPEG } from '../supabase/functions/_shared/media.mjs';

test('image upload pipeline decodes and re-encodes JPEG, removing appended payloads', () => {
  const original = jpeg.encode({ width: 2, height: 2, data: new Uint8Array(16).fill(255) }, 80).data;
  const payload = Buffer.concat([original, Buffer.from('PRIVATE_METADATA_OR_EXTRA_PAYLOAD')]);
  const clean = sanitizeJPEG(payload, jpeg);
  assert.equal(jpeg.decode(clean).width, 2);
  assert.ok(!Buffer.from(clean).includes(Buffer.from('PRIVATE_METADATA')));
  assert.equal(clean.at(-2), 0xff); assert.equal(clean.at(-1), 0xd9);
});
test('image pipeline rejects non-images, corrupt JPEG and oversized uploads', () => {
  assert.throws(() => sanitizeJPEG(new TextEncoder().encode('<script>bad</script>'), jpeg), /JPEG/);
  assert.throws(() => sanitizeJPEG(new Uint8Array([255,216,1,2,3]), jpeg), /decoded safely/);
  assert.throws(() => sanitizeJPEG(new Uint8Array(8388609), jpeg), /8 MB/);
});
