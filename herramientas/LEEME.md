# Generador de decoraciones

Dibuja los PNG de `../decoraciones/` y reescribe el `catalogo` de
`../decoraciones.json`. No hace falta instalar nada: usa solo lo que ya trae Node.

```bash
cd herramientas
node decoraciones.js
```

- `png.js` escribe PNG RGBA a mano (zlib para comprimir, CRC32 para los trozos)
  y trae un lienzo con mezcla alfa y suavizado de bordes por muestreo 3x3.
- `decoraciones.js` tiene las formas (`anillo`, `puntos`, `cometa`) y la lista
  de decoraciones. Para anadir una, metela en `DECORACIONES` y vuelve a lanzarlo.

Las medidas importan: la imagen es de 288x288 y el avatar ocupa el centro, asi
que **nada puede dibujarse dentro del radio 104** o lo tapara. La constante
`LIBRE` se encarga de recortarlo, pero conviene tenerlo en cuenta al disenar.

Los colores son `[r, g, b]` de 0 a 255, y `mezcla(a, b, t)` interpola entre dos.
