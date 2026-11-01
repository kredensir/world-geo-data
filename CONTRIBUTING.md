# Contribuir a World Geo Data

¡Gracias por querer mejorar la base de datos! Las contribuciones de datos, código y documentación son bienvenidas.

## Antes de empezar

- Revisá los [issues](https://github.com/kredensir/world-geo-data/issues) abiertos para no duplicar trabajo.
- Para cambios grandes, abrí un issue primero y explicá qué país, provincia o localidad querés agregar o corregir.
- No edites manualmente los archivos de `data/` si el cambio se puede reproducir con el generador. En la próxima regeneración se perdería.

## Flujo de trabajo

1. Hacé un fork del repositorio.
2. Creá una rama descriptiva:

   ```bash
   git checkout -b feat/ciudades-chile
   # o
   git checkout -b fix/nombre-provincia
   ```

3. Hacé el cambio.
4. Regenerá y validá los datos:

   ```bash
   node scripts/build.js
   node scripts/validate.js
   ```

5. Commiteá con un mensaje claro.
6. Abrí un Pull Request contra `main`.

## ¿Dónde se cambia cada cosa?

| Cambio | Archivo |
|---|---|
| Agregar un país nuevo | `scripts/build.js` (`DEFAULT_COUNTRIES`) y `scripts/data/state-map.json` |
| Corregir el nombre o código de una provincia | `scripts/data/state-map.json` |
| Corregir una localidad (provincia, nombre, coordenadas) | `scripts/data/city-overrides.json` |
| Cambiar el filtro de localidades | `scripts/build.js` (`CITY_FCODES`) |
| Mejorar la documentación | `README.md`, `docs/` o `examples/` |
| Corregir un dato de una ciudad | Preferentemente en [GeoNames](https://www.geonames.org/); si no es posible, abrí un issue con la fuente |

## Reglas para datos

- **Fuente:** todo dato nuevo o corregido debe tener una fuente verificable (GeoNames, instituto de estadística, gobierno, INE, etc.).
- **Nombres:** usá el nombre oficial o el más reconocido localmente, con acentos y caracteres correctos.
- **Códigos:** los países usan ISO 3166-1 alpha-2. Las provincias usan ISO 3166-2 cuando existe.
- **Coordenadas:** grados decimales, WGS84.
- **Población:** número entero. Si se desconoce, usar `0` y aclararlo en el issue/PR.
- **Duplicados:** una localidad puede repetir nombre en distintas provincias, pero no debe repetir `id` dentro del mismo archivo.

## Reglas para código

- Node.js 18 o superior.
- Sin dependencias externas para el generador y el validador (solo módulos nativos).
- Mantené el estilo del código existente.
- Si agregás una función nueva, incluí una validación o un test manual documentado.

## Validación

Antes de abrir el PR, ejecutá:

```bash
node scripts/validate.js
```

El comando debe terminar con `Validación OK.` y sin errores.

## Licencia

Al contribuir, aceptás que:

- El código se distribuya bajo la licencia MIT.
- Los datos se distribuyan bajo CC BY 4.0, con atribución a World Geo Data y GeoNames.
