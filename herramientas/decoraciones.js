const fs = require("fs");
const path = require("path");
const { lienzo, mezcla } = require("./png.js");

const SALIDA = "C:/Users/magoe/Documents/xyzen-insignias/decoraciones";
fs.mkdirSync(SALIDA, { recursive: true });

// El avatar ocupa el centro, asi que todo lo que se dibuje tiene que quedar
// por fuera de este radio o lo tapara.
const LIBRE = 104;

/** Para cosas con dos bordes, como un aro: d es la distancia con signo al centro del trazo. */
const suave = (borde, d) => Math.max(0, Math.min(1, borde - Math.abs(d)));

/**
 * Para cosas macizas: f es negativo dentro de la forma y positivo fuera.
 * Con suave() salia solo el contorno, porque en el centro la distancia es
 * grande y lo tomaba por "lejos del borde".
 */
const dentroDe = f => Math.max(0, Math.min(1, -f));

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

/** Aro cortado a trozos, como una linea discontinua. */
function segmentos({ radio, grosor, cuantos, relleno = 0.6, color, color2, desfase = 0 }) {
    const paso = (Math.PI * 2) / cuantos;
    return (x, y) => {
        const d = Math.hypot(x, y);
        const dentro = suave(grosor / 2, d - radio);
        if (dentro <= 0) return null;

        const ang = Math.atan2(y, x) - desfase;
        // Cuanto nos hemos metido dentro del trozo actual, de 0 a 1.
        let t = ((ang % paso) + paso) % paso / paso;
        if (t > relleno) return null;

        // Las puntas de cada trozo se suavizan para que no corten en seco.
        const borde = Math.min(t, relleno - t) / relleno;
        const a = dentro * Math.min(1, borde * 8);

        let c = color;
        if (color2) {
            const vuelta = Math.abs(((ang / Math.PI) + 1) % 2 - 1);
            c = mezcla(color, color2, vuelta);
        }
        return [c, a];
    };
}

/** Picos triangulares apuntando hacia fuera, tipo corona. */
function picos({ radio, cuantos, alto, ancho, color, desfase = 0 }) {
    const paso = (Math.PI * 2) / cuantos;
    return (x, y) => {
        const d = Math.hypot(x, y);
        if (d < radio || d > radio + alto) return null;

        const ang = Math.atan2(y, x) - desfase;
        // Distancia angular al eje del pico mas cercano.
        let dist = ((ang % paso) + paso) % paso;
        if (dist > paso / 2) dist -= paso;

        // El pico se estrecha segun se aleja del centro.
        const subida = (d - radio) / alto;
        const medio = (ancho / 2) * (1 - subida);
        const fuera = Math.abs(dist * d) - medio * radio;
        const a = dentroDe(fuera);
        return a > 0 ? [color, a] : null;
    };
}

/** Estrellas de cuatro puntas repartidas en circulo. */
function estrellas({ radio, cuantos, tam, color, desfase = 0, punta = 0.62 }) {
    const centros = [];
    for (let i = 0; i < cuantos; i++) {
        const ang = desfase + (i / cuantos) * Math.PI * 2;
        centros.push([Math.cos(ang) * radio, Math.sin(ang) * radio]);
    }
    return (x, y) => {
        for (const [cx, cy] of centros) {
            const dx = Math.abs(x - cx);
            const dy = Math.abs(y - cy);
            if (dx > tam || dy > tam) continue;
            // Un astroide: da una estrella de cuatro puntas con los lados curvos.
            // Cuanto mas bajo es "punta", mas afiladas y flacas salen.
            const v = Math.pow(dx / tam, punta) + Math.pow(dy / tam, punta);
            // El borde se suaviza en proporcion al tamano, no en pixeles.
            const a = dentroDe((v - 1) * tam * 0.55);
            if (a > 0) return [color, a];
        }
        return null;
    };
}

/** Un aro ovalado y torcido, de los que parecen una orbita. */
function orbita({ ancho, alto, grosor, giro, color }) {
    const cos = Math.cos(giro);
    const sin = Math.sin(giro);
    return (x, y) => {
        const gx = (x * cos + y * sin) / ancho;
        const gy = (-x * sin + y * cos) / alto;
        const d = Math.hypot(gx, gy);
        // Se multiplica por el tamano para que el grosor salga en pixeles.
        const a = suave(grosor / 2, (d - 1) * Math.min(ancho, alto));
        return a > 0 ? [color, Math.min(1, a)] : null;
    };
}

/** Marcas que salen del aro hacia fuera, como las de un reloj. */
function muescas({ radio, cuantos, largo, grosor, color, desfase = 0 }) {
    const paso = (Math.PI * 2) / cuantos;
    return (x, y) => {
        const d = Math.hypot(x, y);
        if (d < radio || d > radio + largo) return null;

        const ang = Math.atan2(y, x) - desfase;
        let dist = ((ang % paso) + paso) % paso;
        if (dist > paso / 2) dist -= paso;

        const a = suave(grosor / 2, dist * d);
        return a > 0 ? [color, Math.min(1, a)] : null;
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
    },
    {
        id: "corona",
        nombre: "Corona",
        categoria: "Formas",
        descripcion: "Picos dorados apuntando hacia fuera, como una corona.",
        etiquetas: ["oro", "picos"],
        capas: [
            anillo({ radio: 114, grosor: 5, color: ORO }),
            picos({ radio: 116, cuantos: 12, alto: 17, ancho: 0.1, color: ORO })
        ]
    },
    {
        id: "estrellas",
        nombre: "Estrellas",
        categoria: "Formas",
        descripcion: "Ocho estrellas de cuatro puntas, sin aro que las una.",
        etiquetas: ["estrellas", "sin aro"],
        capas: [
            estrellas({ radio: 121, cuantos: 6, tam: 17, color: BLANCO }),
            estrellas({ radio: 126, cuantos: 6, tam: 9, color: HIELO, desfase: Math.PI / 6 })
        ]
    },
    {
        id: "discontinuo",
        nombre: "Aro discontinuo",
        categoria: "Formas",
        descripcion: "Un aro cortado a trozos, que va del violeta al rosa.",
        etiquetas: ["violeta", "trozos"],
        capas: [segmentos({ radio: 118, grosor: 9, cuantos: 16, relleno: 0.55, color: VIOLETA, color2: ROSA })]
    },
    {
        id: "orbita",
        nombre: "Órbita",
        categoria: "Formas",
        descripcion: "Dos aros ovalados cruzados, como las órbitas de un átomo.",
        etiquetas: ["azul", "espacio"],
        capas: [
            orbita({ ancho: 138, alto: 108, grosor: 4, giro: 0.5, color: AZUL }),
            orbita({ ancho: 138, alto: 108, grosor: 4, giro: -0.5, color: mezcla(AZUL, BLANCO, 0.45) })
        ]
    },
    {
        id: "reloj",
        nombre: "Muescas",
        categoria: "Formas",
        descripcion: "Un aro fino con marcas alrededor, como la esfera de un reloj.",
        etiquetas: ["discreto", "marcas"],
        capas: [
            anillo({ radio: 113, grosor: 3, color: [190, 195, 210] }),
            muescas({ radio: 117, cuantos: 24, largo: 8, grosor: 2.6, color: [190, 195, 210] }),
            muescas({ radio: 117, cuantos: 4, largo: 14, grosor: 4, color: BLANCO })
        ]
    },
    {
        id: "arcoiris",
        nombre: "Arcoíris",
        categoria: "Colores",
        descripcion: "Un aro que pasa por todos los colores al dar la vuelta.",
        etiquetas: ["colores", "alegre"],
        capas: [(x, y) => {
            const d = Math.hypot(x, y);
            const a = suave(6, d - 118);
            if (a <= 0) return null;
            // El tono da una vuelta entera, de ahi que se vean todos los colores.
            const t = ((Math.atan2(y, x) / (Math.PI * 2)) + 1) % 1;
            const f = n => {
                const k = (n + t * 6) % 6;
                return Math.round(255 * Math.max(0, Math.min(1, Math.min(k, 4 - k, 1))));
            };
            return [[f(5), f(3), f(1)], a];
        }]
    },
    {
        id: "neon-rosa",
        nombre: "Neón rosa",
        categoria: "Colores",
        descripcion: "Un aro fino con mucho brillo alrededor, como un tubo de neón.",
        etiquetas: ["rosa", "brillo"],
        capas: [
            anillo({ radio: 119, grosor: 14, color: ROSA, brillo: 16 }),
            anillo({ radio: 119, grosor: 4, color: BLANCO })
        ]
    },
    {
        id: "burbujas",
        nombre: "Burbujas",
        categoria: "Formas",
        descripcion: "Burbujas de distintos tamaños flotando alrededor.",
        etiquetas: ["azul", "sin aro"],
        capas: [
            puntos({ radio: 118, cuantos: 5, tam: 8, color: mezcla(AZUL, BLANCO, 0.3) }),
            puntos({ radio: 130, cuantos: 7, tam: 4.5, color: AZUL, desfase: 0.4 }),
            puntos({ radio: 124, cuantos: 9, tam: 2.2, color: BLANCO, desfase: 0.9 })
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
