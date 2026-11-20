const fs = require("fs");
const path = require("path");
const { lienzo, mezcla } = require("./png.js");

const SALIDA = "C:/Users/magoe/Documents/xyzen-insignias/decoraciones";
fs.mkdirSync(SALIDA, { recursive: true });

// El avatar ocupa el centro, asi que todo lo que se dibuje tiene que quedar
// por fuera de este radio o lo tapara.
const LIBRE = 104;

const suave = (borde, d) => Math.max(0, Math.min(1, borde - Math.abs(d)));

/** Un anillo de color, opcionalmente con el color cambiando segun el angulo. */
function anillo({ radio, grosor, color, color2, brillo = 0 }) {
    return (x, y) => {
        const d = Math.hypot(x, y);
        const dentro = suave(grosor / 2, d - radio);
        const halo = brillo > 0 ? Math.max(0, 1 - Math.abs(d - radio) / (grosor / 2 + brillo)) ** 3 : 0;
        const a = Math.max(dentro, halo * 0.45);
        if (a <= 0) return null;

        let c = color;
        if (color2) {
            // El angulo da la vuelta entera, asi que se va y se vuelve para
            // que no haya un corte feo donde se juntan los extremos.
            const t = Math.abs(((Math.atan2(y, x) / Math.PI) + 1) % 2 - 1);
            c = mezcla(color, color2, t);
        }
        return [c, a];
    };
}

/** Puntos repartidos en circulo, como chispas. */
function puntos({ radio, cuantos, tam, color, desfase = 0 }) {
    const centros = [];
    for (let i = 0; i < cuantos; i++) {
        const ang = desfase + (i / cuantos) * Math.PI * 2;
        centros.push([Math.cos(ang) * radio, Math.sin(ang) * radio]);
    }
    return (x, y) => {
        for (const [cx, cy] of centros) {
            const d = Math.hypot(x - cx, y - cy);
            const a = suave(tam, d - tam);
            if (a > 0) return [color, Math.min(1, a)];
        }
        return null;
    };
}

/** Un cometa: punto gordo con estela que se va apagando hacia atras. */
function cometa({ radio, grosor, color, largo = 1.5 }) {
    return (x, y) => {
        const d = Math.hypot(x, y);
        const enElCarril = suave(grosor / 2, d - radio);
        if (enElCarril <= 0) return null;

        // 0 en la cabeza del cometa, crece hacia atras.
        let ang = Math.atan2(y, x) + Math.PI / 2;
        while (ang < 0) ang += Math.PI * 2;
        while (ang > Math.PI * 2) ang -= Math.PI * 2;

        if (ang > largo) return null;
        const fuerza = (1 - ang / largo) ** 2;
        return [color, enElCarril * fuerza];
    };
}

const VIOLETA = [155, 105, 245];
const ROSA = [214, 140, 255];
const NARANJA = [255, 149, 61];
const ROJO = [232, 61, 61];
const HIELO = [150, 220, 255];
const BLANCO = [245, 250, 255];
const VERDE = [96, 224, 150];
const AZUL = [86, 160, 255];
const ORO = [255, 206, 92];

const DECORACIONES = [
    {
        id: "aro-violeta",
        nombre: "Aro violeta",
        categoria: "Xyzen",
        descripcion: "Un aro degradado de violeta a rosa, con algo de brillo alrededor.",
        etiquetas: ["violeta", "suave"],
        capas: [anillo({ radio: 118, grosor: 11, color: VIOLETA, color2: ROSA, brillo: 7 })]
    },
    {
        id: "aro-fuego",
        nombre: "Aro de fuego",
        categoria: "Xyzen",
        descripcion: "Naranja por arriba y rojo por abajo, como una brasa.",
        etiquetas: ["fuego", "calido"],
        capas: [anillo({ radio: 118, grosor: 12, color: NARANJA, color2: ROJO, brillo: 8 })]
    },
    {
        id: "aro-hielo",
        nombre: "Aro de hielo",
        categoria: "Xyzen",
        descripcion: "Azul claro que se aclara hasta el blanco, con escarcha alrededor.",
        etiquetas: ["hielo", "frio"],
        capas: [
            anillo({ radio: 118, grosor: 10, color: HIELO, color2: BLANCO, brillo: 9 }),
            puntos({ radio: 133, cuantos: 12, tam: 2.4, color: BLANCO, desfase: 0.26 })
        ]
    },
    {
        id: "cometa",
        nombre: "Cometa",
        categoria: "Xyzen",
        descripcion: "Un aro fino con un cometa dando vueltas por fuera.",
        etiquetas: ["violeta", "espacio"],
        capas: [
            anillo({ radio: 116, grosor: 3, color: [120, 95, 190] }),
            cometa({ radio: 128, grosor: 9, color: ROSA, largo: 2.1 })
        ]
    },
    {
        id: "doble-aro",
        nombre: "Doble aro",
        categoria: "Xyzen",
        descripcion: "Dos aros finos, uno verde y otro azul, muy discretos.",
        etiquetas: ["verde", "discreto"],
        capas: [
            anillo({ radio: 113, grosor: 4, color: VERDE }),
            anillo({ radio: 126, grosor: 3, color: AZUL })
        ]
    },
    {
        id: "chispas-oro",
        nombre: "Chispas de oro",
        categoria: "Xyzen",
        descripcion: "Sin aro: solo chispas doradas de distintos tamaños alrededor.",
        etiquetas: ["oro", "sin aro"],
        capas: [
            puntos({ radio: 120, cuantos: 8, tam: 4.5, color: ORO }),
            puntos({ radio: 133, cuantos: 8, tam: 2.4, color: mezcla(ORO, BLANCO, 0.5), desfase: Math.PI / 8 })
        ]
    }
];

console.log("Dibujando en", SALIDA);
const hechas = [];

for (const deco of DECORACIONES) {
    const l = lienzo();
    for (const capa of deco.capas) {
        // Nada puede invadir el hueco del avatar.
        l.dibujar((x, y) => (Math.hypot(x, y) < LIBRE ? null : capa(x, y)));
    }

    const archivo = `${deco.id}.png`;
    l.guardar(path.join(SALIDA, archivo));
    const bytes = fs.statSync(path.join(SALIDA, archivo)).size;
    console.log(`  ${archivo.padEnd(18)} ${String(bytes).padStart(6)} bytes`);

    hechas.push({
        id: deco.id,
        nombre: deco.nombre,
        categoria: deco.categoria,
        descripcion: deco.descripcion,
        etiquetas: deco.etiquetas,
        imagen: `https://raw.githubusercontent.com/Xy-Zen/xyzen-insignias/main/decoraciones/${archivo}`
    });
}

const destino = "C:/Users/magoe/Documents/xyzen-insignias/decoraciones.json";
const actual = JSON.parse(fs.readFileSync(destino, "utf8"));
actual.catalogo = hechas;
fs.writeFileSync(destino, JSON.stringify(actual, null, 4) + "\n");
console.log("\ndecoraciones.json actualizado con", hechas.length, "decoraciones");
