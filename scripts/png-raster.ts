/**
 * Decode and compare the raster behind two canonical Component example PNGs.
 *
 * Chromium re-rasterizes identical source with occasional sub-pixel variation
 * that no reader can perceive, so byte equality is too strict a test for
 * "did this image change". These helpers answer the weaker, truthful question
 * the repository actually needs: does the committed image still show what the
 * current source renders?
 *
 * The decoder deliberately accepts only the exact PNG shape
 * `componentExampleScreenshotOptions` produces — 8-bit RGB, non-interlaced,
 * one deflate stream — and refuses anything else rather than guessing.
 */

/** One decoded image as row-major RGB triples. */
export interface CanonicalPngRaster {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/**
 * The perceptual budget separating raster noise from a real visual change.
 *
 * Measured against this repository's own history: observed noise reaches 38
 * changed pixels at a maximum channel delta of 2, while the smallest real
 * change is 105 changed pixels at a delta of 71. Both bounds must hold, so a
 * uniform one-step shift across a whole image stays a real change.
 */
export const componentExampleRasterTolerance = Object.freeze({
  maxChannelDelta: 2,
  maxChangedPixels: 64,
});

/** The relationship between two decoded rasters. */
export type ComponentExampleRasterComparison =
  | { readonly kind: "geometry" }
  | { readonly kind: "identical" }
  | {
    readonly kind: "differs";
    readonly changedPixels: number;
    readonly maxChannelDelta: number;
  };

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const BYTES_PER_PIXEL = 3;

function paethPredictor(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  return distanceUp <= distanceUpLeft ? up : upLeft;
}

async function inflate(
  compressed: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array> {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(compressed);
      controller.close();
    },
  });
  const stream = source.pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read the header and concatenated image data of a canonical PNG. */
function readCanonicalPngParts(
  bytes: Uint8Array,
  source: string,
): {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array<ArrayBuffer>;
} {
  if (
    bytes.length < 20 ||
    SIGNATURE.some((value, index) => bytes[index] !== value)
  ) {
    throw new TypeError(`${source} is not a PNG`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const payloads: Uint8Array[] = [];
  let width = 0;
  let height = 0;
  let header = false;
  let offset: number = SIGNATURE.length;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      throw new TypeError(`${source} has a truncated chunk`);
    }
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) {
      throw new TypeError(`${source} has an invalid chunk length`);
    }
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const depth = view.getUint8(offset + 16);
      const colorType = view.getUint8(offset + 17);
      const compression = view.getUint8(offset + 18);
      const filter = view.getUint8(offset + 19);
      const interlace = view.getUint8(offset + 20);
      if (
        depth !== 8 || colorType !== 2 || compression !== 0 || filter !== 0 ||
        interlace !== 0
      ) {
        throw new TypeError(
          `${source} is not 8-bit non-interlaced RGB (depth ${depth}, colour type ${colorType}, interlace ${interlace})`,
        );
      }
      header = true;
    } else if (type === "IDAT") {
      payloads.push(bytes.subarray(offset + 8, offset + 8 + length));
    }
    offset = end;
    if (type === "IEND") break;
  }
  if (!header || width === 0 || height === 0 || payloads.length === 0) {
    throw new TypeError(`${source} has no decodable image data`);
  }
  const total = payloads.reduce((sum, chunk) => sum + chunk.length, 0);
  const data = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of payloads) {
    data.set(chunk, cursor);
    cursor += chunk.length;
  }
  return { width, height, data };
}

/** Decode one canonical Component example PNG to row-major RGB samples. */
export async function decodeCanonicalPngRaster(
  bytes: Uint8Array,
  source: string,
): Promise<CanonicalPngRaster> {
  const { width, height, data } = readCanonicalPngParts(bytes, source);
  const inflated = await inflate(data);
  const stride = width * BYTES_PER_PIXEL;
  if (inflated.length !== height * (stride + 1)) {
    throw new TypeError(
      `${source} inflates to ${inflated.length} bytes; ${width}×${height} needs ${
        height * (stride + 1)
      }`,
    );
  }
  const pixels = new Uint8Array(height * stride);
  const filtered = new DataView(
    inflated.buffer,
    inflated.byteOffset,
    inflated.byteLength,
  );
  const output = new DataView(pixels.buffer);
  let cursor = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = filtered.getUint8(cursor);
    cursor += 1;
    const rowStart = row * stride;
    const previousStart = rowStart - stride;
    for (let index = 0; index < stride; index += 1) {
      const raw = filtered.getUint8(cursor + index);
      const left = index >= BYTES_PER_PIXEL
        ? output.getUint8(rowStart + index - BYTES_PER_PIXEL)
        : 0;
      const up = row > 0 ? output.getUint8(previousStart + index) : 0;
      const upLeft = row > 0 && index >= BYTES_PER_PIXEL
        ? output.getUint8(previousStart + index - BYTES_PER_PIXEL)
        : 0;
      let value: number;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + ((left + up) >> 1);
      else if (filter === 4) value = raw + paethPredictor(left, up, upLeft);
      else throw new TypeError(`${source} row ${row} uses filter ${filter}`);
      output.setUint8(rowStart + index, value & 0xff);
    }
    cursor += stride;
  }
  return { width, height, pixels };
}

/** Measure how two decoded rasters differ, without judging the difference. */
export function compareCanonicalPngRasters(
  committed: CanonicalPngRaster,
  captured: CanonicalPngRaster,
): ComponentExampleRasterComparison {
  if (
    committed.width !== captured.width || committed.height !== captured.height
  ) {
    return { kind: "geometry" };
  }
  const left = new DataView(
    committed.pixels.buffer,
    committed.pixels.byteOffset,
    committed.pixels.byteLength,
  );
  const right = new DataView(
    captured.pixels.buffer,
    captured.pixels.byteOffset,
    captured.pixels.byteLength,
  );
  let changedPixels = 0;
  let maxChannelDelta = 0;
  const samples = committed.width * committed.height * BYTES_PER_PIXEL;
  for (let offset = 0; offset < samples; offset += BYTES_PER_PIXEL) {
    let changed = false;
    for (let channel = 0; channel < BYTES_PER_PIXEL; channel += 1) {
      const delta = Math.abs(
        left.getUint8(offset + channel) - right.getUint8(offset + channel),
      );
      if (delta > 0) {
        changed = true;
        if (delta > maxChannelDelta) maxChannelDelta = delta;
      }
    }
    if (changed) changedPixels += 1;
  }
  if (changedPixels === 0) return { kind: "identical" };
  return { kind: "differs", changedPixels, maxChannelDelta };
}

/**
 * Decide whether a captured raster still shows the committed image.
 *
 * Geometry never qualifies: a resized example is a real change however small
 * the moved area. Everything else must sit inside both tolerance bounds.
 */
export function rasterDifferenceIsImperceptible(
  comparison: ComponentExampleRasterComparison,
): boolean {
  if (comparison.kind === "geometry") return false;
  if (comparison.kind === "identical") return true;
  return comparison.maxChannelDelta <=
      componentExampleRasterTolerance.maxChannelDelta &&
    comparison.changedPixels <=
      componentExampleRasterTolerance.maxChangedPixels;
}
