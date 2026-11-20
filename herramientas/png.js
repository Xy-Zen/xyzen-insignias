// Generador de PNG RGBA sin dependencias: solo zlib, que ya trae Node.
const zlib = require("zlib");

const TAM = 288;

/** CRC32, que es lo que pide el formato PNG al final de cada trozo. */
const TABLA = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = TABLA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}

function trozo(tipo, datos) {
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(cuerpo));
    return Buffer.concat([largo, cuerpo, crc]);
}

/** pixeles: Uint8Array de TAM*TAM*4 (rgba). */
function png(pixeles, tam = TAM) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(tam, 0);
    ihdr.writeUInt32BE(tam, 4);
    ihdr[8] = 8;   // 8 bits por canal
    ihdr[9] = 6;   // RGBA
    ihdr[10] = 0;  // deflate
    ihdr[11] = 0;  // filtro adaptativo
    ihdr[12] = 0;  // sin entrelazado

    // Cada fila lleva delante un byte de filtro; usamos 0 (ninguno).
    const crudo = Buffer.alloc(tam * (tam * 4 + 1));
    for (let y = 0; y < tam; y++) {
        const destino = y * (tam * 4 + 1);
        crudo[destino] = 0;
        pixeles.copy
            ? pixeles.copy(crudo, destino + 1, y * tam * 4, (y + 1) * tam * 4)
            : Buffer.from(pixeles.buffer, y * tam * 4, tam * 4).copy(crudo, destino + 1);
    }

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        trozo("IHDR", ihdr),
        trozo("IDAT", zlib.deflateSync(crudo, { level: 9 })),
        trozo("IEND", Buffer.alloc(0))
    ]);
}

/** Lienzo con mezcla alfa y muestreo 3x3 para que los bordes no salgan dentados. */
function lienzo(tam = TAM) {
    const px = Buffer.alloc(tam * tam * 4);

    function pintar(x, y, [r, g, b], a) {
        if (a <= 0) return;
        const i = (y * tam + x) * 4;
        const viejaA = px[i + 3] / 255;
        const nuevaA = a + viejaA * (1 - a);
        if (nuevaA <= 0) return;
        px[i] = Math.round((r * a + px[i] * viejaA * (1 - a)) / nuevaA);
        px[i + 1] = Math.round((g * a + px[i + 1] * viejaA * (1 - a)) / nuevaA);
        px[i + 2] = Math.round((b * a + px[i + 2] * viejaA * (1 - a)) / nuevaA);
        px[i + 3] = Math.round(nuevaA * 255);
    }

    /**
     * forma(x, y) devuelve [color, alfa] para un punto, o null si ahi no hay
     * nada. Se llama 9 veces por pixel y se promedia: asi los bordes quedan
     * suaves sin tener que hacer nada raro.
     */
    function dibujar(forma) {
        const centro = tam / 2;
        for (let y = 0; y < tam; y++) {
            for (let x = 0; x < tam; x++) {
                let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 3; dx++) {
                        const mx = x + (dx + 0.5) / 3 - centro;
                        const my = y + (dy + 0.5) / 3 - centro;
                        const r = forma(mx, my);
                        n++;
                        if (!r) continue;
                        const [[cr, cg, cb], ca] = r;
                        sr += cr * ca; sg += cg * ca; sb += cb * ca; sa += ca;
                    }
                }
                if (sa <= 0) continue;
                pintar(x, y, [sr / sa, sg / sa, sb / sa], sa / n);
            }
        }
    }

    return { px, dibujar, guardar: ruta => require("fs").writeFileSync(ruta, png(px, tam)) };
}

const mezcla = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

module.exports = { TAM, lienzo, mezcla };
