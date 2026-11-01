# Scripts

Herramientas para generar y validar los datos. No requieren dependencias externas: solo Node.js 18+ y `tar` o `unzip` para extraer el ZIP de GeoNames.

## `build.js`

Genera `data/countries.json`, `data/states/*.json`, `data/cities/**/*.json` y `data/index.json`.

```bash
node scripts/build.js
node scripts/build.js --countries=AR,BO,BR
```

Pasos:

1. Descarga las fuentes a `.cache/geonames/` (ignorado por git).
2. Extrae `allCountries.txt` de `allCountries.zip`.
3. Filtra los países indicados en `DEFAULT_COUNTRIES`.
4. Incluye localidades con `fcode` poblado, excluyendo barrios (`PPLX`), abandonados (`PPLQ`), destruidos (`PPLW`) e históricos (`PPLH`).
5. Agrupa por país y división `admin1`.
6. Escribe un archivo por provincia/estado.

### Variables y configuración

| Constante | Descripción |
|---|---|
| `DEFAULT_COUNTRIES` | Países que se generan por defecto. |
| `CITY_FCODES` | Códigos de GeoNames que se incluyen. |
| `STATE_MAP_PATH` | Ruta a `scripts/data/state-map.json`. |
| `CITY_OVERRIDES_PATH` | Ruta a `scripts/data/city-overrides.json`. |

### Agregar un país

1. Agregá el código ISO a `DEFAULT_COUNTRIES`.
2. Agregá sus divisiones a `scripts/data/state-map.json`:

```json
{
  "XX": [
    {
      "admin1": "01",
      "code": "01",
      "iso": "XX-01",
      "name": "Provincia Ejemplo",
      "type": "provincia",
      "id": 123456
    }
  ]
}
```

- `admin1`: código de `admin1CodesASCII.txt`.
- `code`: código que se usará en `data/cities/XX/{code}.json`.
- `iso`: código ISO 3166-2 completo o `null`.
- `name`: nombre para mostrar.
- `type`: tipo de división en español.
- `id`: `geonameid` de la división (para obtener coordenadas y población).

3. Ejecutá:

```bash
node scripts/build.js --countries=XX
node scripts/validate.js
```

## `validate.js`

Verifica:

- JSON válido.
- Códigos de país y provincia únicos.
- Campos obligatorios.
- Coordenadas numéricas.
- `cities_count` contra la cantidad real de ciudades.
- IDs de ciudad únicos dentro de cada provincia.
- Totales de `data/index.json`.

```bash
node scripts/validate.js
```

Debe terminar con `Validación OK.`

## `data/state-map.json`

Es la única fuente que se edita a mano para agregar o corregir provincias. Contiene la relación entre GeoNames, ISO 3166-2 y el nombre para mostrar.

Si corregís un nombre, un código o un tipo, hacelo acá y volvé a generar los datos. No edites `data/states/*.json` ni `data/cities/**/*.json` a mano.

## `data/city-overrides.json`

Correcciones puntuales de localidades, indexadas por `geonameid`. Se aplican después de leer GeoNames y antes de agrupar por provincia.

```json
{
  "11151489": {
    "admin1": "01",
    "note": "Villa Celina pertenece a La Matanza, provincia de Buenos Aires."
  }
}
```

Campos admitidos:

| Campo | Descripción |
|---|---|
| `admin1` | Reasigna la localidad a otro código `admin1` (por ejemplo, para corregir una provincia). |
| `admin2` | Cambia el código de municipio/departamento. |
| `name` | Reemplaza el nombre. |
| `lat`, `lng` | Reemplaza las coordenadas. |
| `exclude` | Si es `true`, la localidad no se incluye. |
| `note` | Comentario para documentar la corrección (no se exporta). |

Úsalo solo para errores verificables. Si el dato se puede corregir en GeoNames, mejor hacerlo allí para que el arreglo beneficie a todos.
