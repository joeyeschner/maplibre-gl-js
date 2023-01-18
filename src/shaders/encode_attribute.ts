import {clamp} from '../util/util';

/**
 * Packs two numbers, interpreted as 8-bit unsigned integers, into a single
 * float.  Unpack them in the shader using the `unpack_float()` function,
 * defined in _prelude.vertex.glsl
 *
 * @private
 */
export function packUint8ToFloat(a: number, b: number) {
    // coerce a and b to 8-bit ints
    a = clamp(Math.floor(a), 0, 255);
    b = clamp(Math.floor(b), 0, 255);
    return 256 * a + b;
}

export function packFloatToColor(value: number) {
    const a = ((value / 256.0) - (Math.floor(value / 256))) * 256
    const b = ((Math.floor(value / 256) / 256.0) - Math.floor(Math.floor(value / 256) / 256 )) * 256
    const g = ((Math.floor(Math.floor(value / 256) / 256) / 256.0) - Math.floor(Math.floor(Math.floor(value / 256) / 256 ) / 256)) * 256
    const r = ((Math.floor(Math.floor(Math.floor(value / 256) / 256) / 256) / 256.0) - Math.floor(Math.floor(Math.floor(Math.floor(value / 256) / 256 ) / 256 ) / 256)) * 256
    return [r, g, b, a];
}

export function packUint8Vec4ToColor(value: Array<number>) {
    const r = clamp(Math.floor(value[0]), 0, 255);
    const g = clamp(Math.floor(value[1]), 0, 255);
    const b = clamp(Math.floor(value[2]), 0, 255);
    const a = clamp(Math.floor(value[3]), 0, 255);
    return [r, g, b, a];
}

export function unpackColorToFloat(value: Array<number>) {
    return value[0] * 256 * 256 * 256 + value[1] * 256 * 256 + value[2] * 256 + value[3];
}
