# Esquema de datos

Todos los archivos son JSON UTF-8. La versión actual del esquema es **2.0.0** y se informa en `data/index.json`.

## Estructura

```text
data/
├── countries.json
├── index.json
├── states/
│   └── {CC}.json
└── cities/
    └── {CC}/
        └── {STATE}.json
```

- `{CC}`: código ISO 3166-1 alpha-2 del país (por ejemplo, `AR`).
- `{STATE}`: código ISO 3166-2 sin el prefijo del país (por ejemplo, `B` para `AR-B`) o, si no existe, el código `admin1` de GeoNames.

## `countries.json`

Array de países ordenado por `name_es`.

| Campo | Tipo | Nullable | Descripción |
|---|---|---|---|
| `code` | string | no | ISO 3166-1 alpha-2. |
| `code3` | string | no | ISO 3166-1 alpha-3. |
| `numeric` | string | sí | Código numérico ISO 3166-1 (`null` si no existe). |
| `name` | string | no | Nombre en inglés (GeoNames). |
| `name_es` | string | no | Nombre en español. |
| `flag` | string | no | Emoji de bandera. |
| `capital` | string | sí | Capital según GeoNames. |
| `continent` | string | no | Código de continente GeoNames (`AF`, `AN`, `AS`, `EU`, `NA`, `OC`, `SA`). |
| `continent_name` | string | sí | Nombre del continente en español. |
| `region` | string | no | Región geográfica. |
| `subregion` | string | sí | Subregión (para América). |
| `phone` | string | sí | Prefijo telefónico con `+`. |
| `currency` | string | sí | Código ISO 4217. |
| `currency_name` | string | sí | Nombre de la moneda. |
| `languages` | string[] | no | Códigos de idioma. |
| `population` | number | no | Población estimada. |
| `area_km2` | number | no | Superficie en km². |
| `lat` | number | sí | Latitud del centro del país. |
| `lng` | number | sí | Longitud del centro del país. |
| `geoname_id` | number | sí | ID de GeoNames. |

## `states/{CC}.json`

Array de provincias/estados ordenado por `name`.

| Campo | Tipo | Nullable | Descripción |
|---|---|---|---|
| `code` | string | no | Código usado en la ruta de ciudades. |
| `iso` | string | sí | Código ISO 3166-2 completo (por ejemplo, `AR-Y`). |
| `name` | string | no | Nombre para mostrar. |
| `type` | string | no | Tipo de división en español (`provincia`, `estado`, `departamento`, `región`, `distrito`, etc.). |
| `admin1` | string | no | Código `admin1` de GeoNames. |
| `id` | number | sí | ID de GeoNames de la división. |
| `lat` | number | sí | Latitud del centro de la división. |
| `lng` | number | sí | Longitud del centro de la división. |
| `timezone` | string | sí | Zona horaria dominante. |
| `population` | number | no | Población de la división según GeoNames. |
| `cities_count` | number | no | Cantidad de elementos en el archivo de ciudades. |

## `cities/{CC}/{STATE}.json`

Array de localidades ordenado por `name` (orden alfabético, insensible a acentos).

| Campo | Tipo | Nullable | Descripción |
|---|---|---|---|
| `id` | number | no | ID de GeoNames. |
| `name` | string | no | Nombre de la localidad. |
| `ascii` | string | sí | Nombre sin acentos. Solo se incluye si difiere de `name`. |
| `lat` | number | no | Latitud (WGS84). |
| `lng` | number | no | Longitud (WGS84). |
| `population` | number | no | Población. `0` = desconocida o no informada. |
| `fcode` | string | no | Código de tipo de lugar de GeoNames. |
| `municipality` | string | sí | Municipio, partido o departamento. Solo si GeoNames lo informa. |
| `timezone` | string | sí | Zona horaria. Solo se incluye si difiere de la del estado. |

### Ejemplo

```json
[
  {
    "id": 3867009,
    "name": "Abra Pampa",
    "lat": -22.72273,
    "lng": -65.69693,
    "population": 9425,
    "fcode": "PPLA2",
    "municipality": "Departamento de Cochinoca"
  },
  {
    "id": 12540174,
    "name": "Abra de Punta Corral",
    "lat": -23.71192,
    "lng": -65.38176,
    "population": 0,
    "fcode": "PPL"
  }
]
```

## `index.json`

Metadatos de la generación:

| Campo | Descripción |
|---|---|
| `version` | Versión del esquema. |
| `generated_at` | Fecha y hora de generación en ISO 8601. |
| `sources` | Fuentes y licencias. |
| `totals` | Totales de países, estados y ciudades. |
| `countries` | Cobertura por país (`states`, `cities`). |

## Códigos `fcode`

| Código | Significado |
|---|---|
| `PPLC` | Capital nacional. |
| `PPLA` | Capital de división administrativa de primer nivel. |
| `PPLA2` | Cabecera de división de segundo nivel. |
| `PPLA3` | Cabecera de división de tercer nivel. |
| `PPLA4` | Cabecera de división de cuarto nivel. |
| `PPLA5` | Cabecera de división de quinto nivel. |
| `PPL` | Ciudad, pueblo o localidad. |
| `PPLF` | Aldea o finca. |
| `PPLG` | Sede de gobierno. |
| `PPLL` | Localidad. |
| `PPLR` | Comunidad religiosa. |
| `PPLS` | Caserío. |

## Compatibilidad

La versión 2 cambió el formato de las ciudades: antes era un array de strings y ahora es un array de objetos. Para obtener solo los nombres:

```js
const names = cities.map((city) => city.name);
```

Si necesitás el formato anterior, podés generarlo en tu aplicación o pedir una capa de compatibilidad en un issue.
