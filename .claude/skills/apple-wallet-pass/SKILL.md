---
name: apple-wallet-pass
description: >-
  Diseñar y codificar pases de Apple Wallet (PassKit) que se vean profesionales,
  en especial tarjetas de lealtad tipo storeCard con grid de sellos. Usar cuando
  se toque applePass.ts, pass.json, generación de .pkpass, strip images, colores
  del pase, o cuando un pase "se vea feo/plano".
---

# Apple Wallet Pass — diseño que se ve chingón

## Verdad base (manejar expectativas)

Apple Wallet **NO es un lienzo libre**. La plantilla es rígida. Solo controlas:
`backgroundColor`, `foregroundColor`, `labelColor`, `logoText`, las imágenes
(`logo`, `icon`, **`strip`**), los campos de texto (header/primary/secondary/
auxiliary/back) y el barcode. NO hay gradientes CSS, posiciones libres ni layout
custom. Un pase nunca se verá como una web custom — eso es así para todos
(Starbucks incluido).

**El único gran palanca visual es la `strip` image.** Las tarjetas de sellos
"chingonas" (ej. el grid de marquesitas llenas/vacías) son una **strip PNG
generada dinámicamente** que dibuja los sellos. NO son campos de texto.

## storeCard: anatomía

```
┌───────────────────────────────────────┐
│ [logo]  logoText            headerField│  ← fila superior
├───────────────────────────────────────┤
│                                        │
│            STRIP IMAGE                 │  ← aquí va el grid de sellos
│      (full-width, fondo claro)         │
│                                        │
├───────────────────────────────────────┤
│ secondaryField        auxiliaryField   │  ← debajo del strip
├───────────────────────────────────────┤
│ [ barcode / QR ]                       │
└───────────────────────────────────────┘
```
Regla clave para sellos: **NO uses primaryFields para los sellos** (se ven como
texto plano feo). Pon el grid de sellos en la **strip image** y deja los campos
de texto para premio/comercio/instrucción corta.

## Dimensiones de imagen (storeCard) — exactas

| Imagen | 1x | @2x | @3x |
|---|---|---|---|
| `strip.png` (storeCard) | 375×144 | **750×288** | 1125×432 |
| `logo.png` | ≤160×50 | ≤320×100 | — |
| `icon.png` | 29×29 | 58×58 | 87×87 |

- PNG siempre (Apple rechaza JPEG en el .pkpass). Convertir del lado cliente
  (canvas `toDataURL('image/png')`) o servidor.
- Generar a dimensión exacta; NO recortar ni rellenar con whitespace (Apple lo
  desaconseja explícitamente).
- Aspecto del strip ≈ 3:1 (más bien 2.6:1 para storeCard). Diseñar al @2x
  (750×288) y escalar.

## Colores: el COMERCIO elige (NO forzar crema)

- `backgroundColor` = **el color que el comercio elija** (Apple lo aplica plano,
  sin gradiente — eso sí es límite de Apple). NUNCA hardcodear crema; crema solo
  como fallback si no hay color.
- `foregroundColor`/`labelColor` = **calculados por contraste** sobre el fondo
  elegido (fondo claro → texto oscuro; fondo oscuro → texto claro). Nunca texto
  ilegible.
- El fondo de la `strip` (donde van los sellos) debe ser el MISMO color del
  pase para que se funda, no un recuadro distinto.
- **La preview web DEBE usar el mismo color y el mismo grid** → WYSIWYG real:
  el comercio ve exactamente lo que recibirá.

## "Crea tu sello" (plug & play)

El token de sello del grid es configurable por el comercio (campo `stampStyle`):

- **Presets dibujables sin decodificar imágenes** (con primitivas de raster):
  `disc` (círculo), `star`, `heart`, `cup` (café), `check`. Llenos = forma en
  color de contraste sobre el color de marca; vacíos = anillo tenue.
- **`logo`**: el logo del comercio recortado en círculo, automático. Requiere
  decodificar el PNG del logo. Como el logo lo produce `<canvas>` del onboarding
  es PNG predecible (8-bit, color type 2 RGB ó 6 RGBA, sin interlace, filtros
  0–4). Implementar un decoder mínimo para ESE caso (inflate + unfilter por
  scanline) y **fallback a `disc` si el decode falla** — nunca romper el pase.
- Default: `logo` si hay logo subido; si no, `disc`.
- El onboarding tiene un paso "Tu sello" que muestra los estilos y los aplica
  en vivo en la ApplePassPreview (WYSIWYG).

## Strip de sellos: cómo dibujarlo sin libs nativas

En Lambda no hay `sharp`. Se dibuja un PNG RGBA a mano (encoder propio: IHDR +
IDAT zlib + IEND). Algoritmo del grid:

1. Lienzo @2x 750×288 (y @3x 1125×432), fondo claro (crema) o color de marca
   suave.
2. Calcular columnas: hasta 5 por fila; filas = ceil(total/cols). Token size y
   gaps centrados en el lienzo.
3. Por cada sello i:
   - **lleno** (i < filled): círculo relleno del color de marca + palomita o
     ícono simple en contraste.
   - **vacío**: círculo con borde tenue (anillo), centro del fondo.
4. Antialias barato: dibujar el círculo con borde suavizado por distancia al
   centro (alpha proporcional) — mejora mucho el acabado.

Helpers de raster mínimos a implementar: `fillRect`, `fillCircle(cx,cy,r,rgba)`
con cobertura sub-pixel, `strokeCircle`. Componer y comprimir con `deflateSync`.

## pass.json — campos recomendados (tarjeta de sellos)

```jsonc
{
  "storeCard": {
    "headerFields":   [{ "key":"count","label":"SELLOS","value":"3/8" }],
    "secondaryFields":[{ "key":"reward","label":"TU PREMIO","value":"Un café gratis" }],
    "auxiliaryFields":[{ "key":"merchant","label":"NEGOCIO","value":"Café Origen" }],
    "backFields":     [{ "key":"how","label":"Cómo funciona","value":"..." }]
  }
}
```
Sellos → en el **strip**, NO en primaryFields. `headerField` con `x/N` se ve
incluso con el pase apilado en Wallet.

## Barcode

`PKBarcodeFormatQR`, `message` = un **URL accionable** (deep link a dar sello),
nunca el id suelto (si no, escanear "no abre nada"). `altText` = id corto.

## Checklist al generar un .pkpass

- [ ] Todas las imágenes PNG, dimensiones exactas, @2x y @3x.
- [ ] Sellos dibujados en strip, no en texto.
- [ ] Colores: fondo plano Apple-safe + contraste calculado.
- [ ] logo real (no bloque sólido); fallback a iniciales solo si no hay logo.
- [ ] barcode = deep link.
- [ ] La preview web usa EXACTAMENTE el mismo esquema (WYSIWYG).
- [ ] `pass.type='storeCard'` y webServiceURL/authenticationToken para updates.
- [ ] Verificar firma: `openssl smime -verify -inform DER -in signature
      -content manifest.json -noverify`.

## Fuentes
- developer.apple.com/library/archive/.../PassKit_PG/Creating.html
- help.passkit.com/en/articles/2214902-optimizing-images
- passmeister.com/en/b/image_sizes_apple_wallet
