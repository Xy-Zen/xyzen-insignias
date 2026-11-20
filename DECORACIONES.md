# decoraciones.json

Las decoraciones de avatar de Xyzen. Solo las ve quien usa Xyzen; en el Discord
normal los avatares salen como siempre.

## Formato

```json
{
    "catalogo": [
        {
            "id": "halo-violeta",
            "nombre": "Halo violeta",
            "categoria": "Xyzen",
            "descripcion": "Un aro que gira alrededor del avatar.",
            "imagen": "https://raw.githubusercontent.com/Xy-Zen/xyzen-insignias/main/decoraciones/halo.png"
        }
    ],
    "usuarios": {
        "717781938446008420": "halo-violeta"
    }
}
```

- `catalogo`: lo que sale en la rejilla de Ajustes -> Xyzen Apariencia -> Decoraciones.
- `usuarios`: a quien se le pone cada una. La clave es el numero de Discord
  (ID) y el valor es un `id` del catalogo **o** una direccion https suelta.

Lo que no encaje con este formato se ignora sin romper nada.

## Las imagenes

Un PNG o un GIF con fondo transparente, cuadrado, de 288x288 px. El avatar va
en el centro, asi que el dibujo tiene que dejar el hueco del medio libre.
Se pueden subir a la carpeta `decoraciones/` de este mismo repo.

No se copian aqui las de otros clientes: estan en sus servidores y son suyas.
