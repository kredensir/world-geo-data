# World Geo Data 🌎

**Idiomas:** [English](README.md) · [Español](README.es.md)

[![License: MIT](https://img.shields.io/badge/Código-MIT-blue.svg)](LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/Datos-CC%20BY%204.0-lightgrey.svg)](LICENSE-DATA)
[![PRs Welcome](https://img.shields.io/badge/PRs-bienvenidos-brightgreen.svg)](CONTRIBUTING.md)

Base de datos geográfica abierta de **países, provincias/estados y ciudades**, pensada para ser consumida como JSON estático desde cualquier lenguaje o framework.

El proyecto nació con datos parciales de Argentina y ahora incluye:

- 🌍 **250 países** con código ISO, bandera, capital, moneda, idioma, población y coordenadas.
- 🗺️ **508 provincias/estados** de **25 países de América Latina y el Caribe**.
- 🏙️ **585.789 ciudades y localidades** de esos mismos países, generadas desde GeoNames.

> **Objetivo:** cubrir progresivamente todos los países del mundo con la mayor cantidad posible de localidades, sin depender de una API propietaria.

---

## 📦 Cobertura actual

| Región | Países | Provincias/estados | Ciudades/localidades |
|---|---:|---:|---:|
| América Latina y el Caribe | 25 | 508 | 585.789 |
| Resto del mundo | 225 | — | — |
| **Total de países** | **250** | **508** | **585.789** |

Países incluidos en esta primera etapa:

`AR` Argentina · `BO` Bolivia · `BR` Brasil · `BZ` Belice · `CL` Chile · `CO` Colombia · `CR` Costa Rica · `CU` Cuba · `DO` República Dominicana · `EC` Ecuador · `SV` El Salvador · `GF` Guayana Francesa · `GT` Guatemala · `GY` Guyana · `HT` Haití · `HN` Honduras · `MX` México · `NI` Nicaragua · `PA` Panamá · `PE` Perú · `PR` Puerto Rico · `PY` Paraguay · `SR` Surinam · `UY` Uruguay · `VE` Venezuela

Algunos ejemplos de la mejora respecto de la versión anterior:

| País / provincia | Antes | Ahora |
|---|---:|---:|
| Argentina | ~2.000 localidades | **14.582** |
| Jujuy (AR) | 88 localidades | **460** |
| Bolivia | 0 localidades | **25.625** |
| Brasil | 0 localidades | **66.843** |
| México | 0 localidades | **265.545** |

Los conteos exactos y la fecha de generación están en [`data/index.json`](data/index.json).

> **Nota:** la comarca Naso Tjër Di (`PA-NT`) figura como estado con 0 localidades porque GeoNames todavía no asigna ciudades a esa división. El archivo `data/cities/PA/NT.json` existe y está vacío para mantener la estructura consistente.

---

## 🚀 Inicio rápido

Todos los archivos son JSON públicos. Podés consumirlos directamente desde GitHub:

```js
const BASE = 'https://raw.githubusercontent.com/kredensir/world-geo-data/main/data';

// 1. Países
const countries = await fetch(`${BASE}/countries.json`).then((r) => r.json());

// 2. Provincias de Argentina
const states = await fetch(`${BASE}/states/AR.json`).then((r) => r.json());

// 3. Ciudades de Jujuy (AR-Y)
const cities = await fetch(`${BASE}/cities/AR/Y.json`).then((r) => r.json());

console.log(cities.map((city) => city.name));
```

### Ejemplo de selects encadenados

```html
<select id="country"></select>
<select id="state" disabled></select>
<select id="city" disabled></select>

<script>
const BASE = 'https://raw.githubusercontent.com/kredensir/world-geo-data/main/data';

const countrySelect = document.getElementById('country');
const stateSelect = document.getElementById('state');
const citySelect = document.getElementById('city');

fetch(`${BASE}/countries.json`)
  .then((response) => response.json())
  .then((countries) => {
    countrySelect.innerHTML = '<option value="">Seleccionar país</option>';
    for (const country of countries) {
      countrySelect.innerHTML += `<option value="${country.code}">${country.flag} ${country.name_es}</option>`;
    }
  });

countrySelect.addEventListener('change', async () => {
  stateSelect.disabled = true;
  citySelect.disabled = true;
  stateSelect.innerHTML = '<option value="">Seleccionar provincia</option>';

  const response = await fetch(`${BASE}/states/${countrySelect.value}.json`);
  if (!response.ok) return;

  const states = await response.json();
  stateSelect.disabled = false;
  for (const state of states) {
    stateSelect.innerHTML += `<option value="${state.code}">${state.name}</option>`;
  }
});

stateSelect.addEventListener('change', async () => {
  citySelect.disabled = true;
  citySelect.innerHTML = '<option value="">Seleccionar ciudad</option>';

  const response = await fetch(`${BASE}/cities/${countrySelect.value}/${stateSelect.value}.json`);
  if (!response.ok) return;

  const cities = await response.json();
  citySelect.disabled = false;
  for (const city of cities) {
    citySelect.innerHTML += `<option value="${city.id}">${city.name}</option>`;
  }
});
</script>
```

### Python

```python
import requests

BASE = "https://raw.githubusercontent.com/kredensir/world-geo-data/main/data"

countries = requests.get(f"{BASE}/countries.json", timeout=30).json()
states = requests.get(f"{BASE}/states/AR.json", timeout=30).json()
cities = requests.get(f"{BASE}/cities/AR/Y.json", timeout=30).json()

print(countries[0]["name_es"])
print(states[0]["name"])
print(cities[0]["name"])
```

### Laravel / PHP

Hay una guía completa en [`examples/laravel-integration.md`](examples/laravel-integration.md).

---

## 🗂️ Estructura del repositorio

```text
data/
├── countries.json              # 250 países
├── index.json                  # metadatos, cobertura y conteos
├── states/
│   ├── AR.json                 # provincias de Argentina
│   ├── BO.json                 # departamentos de Bolivia
│   └── ...
└── cities/
    ├── AR/
    │   ├── A.json              # ciudades de Salta
    │   ├── B.json              # ciudades de Buenos Aires
    │   ├── Y.json              # ciudades de Jujuy
    │   └── ...
    ├── BO/
    │   └── ...
    └── ...
```

### ¿Cómo se identifican los archivos?

Los archivos de `data/cities/` **no son un archivo por ciudad**: son un archivo por provincia/estado que contiene todas las localidades de esa división. El nombre del archivo es el **código ISO 3166-2 de la provincia sin el prefijo del país**:

- `AR-B` → `data/cities/AR/B.json`
- `BR-SP` → `data/cities/BR/SP.json`
- `MX-CMX` → `data/cities/MX/CMX.json`
- `CO-ANT` → `data/cities/CO/ANT.json`
- `PR-001` → `data/cities/PR/001.json`
- `PA-1` → `data/cities/PA/1.json`

El código ISO completo está en el campo `iso` de `data/states/{CC}.json`. Por ejemplo, `data/cities/AR/Y.json` corresponde a `AR-Y` (Jujuy), y `data/states/AR.json` contiene `"iso": "AR-Y"`. La ruta `data/cities/AR/Y.json` reconstruye el código completo porque el país está en el directorio padre.

### ¿Por qué no usar el nombre de la ciudad como nombre de archivo?

Porque los nombres no son identificadores estables ni únicos:

- Hay ciudades homónimas en distintas provincias y países.
- Tienen acentos, espacios, apóstrofos y caracteres que cambian según el sistema de archivos.
- Los sistemas de archivos de Windows y macOS no distinguen mayúsculas de minúsculas.
- Los nombres pueden cambiar con el tiempo; el ID de GeoNames no.
- Serían cientos de miles de archivos pequeños en lugar de archivos por provincia.

Cada ciudad tiene un campo `id` con el **GeoNames ID**, que es único y estable. Ese es el identificador recomendado para una localidad. Para mostrar un nombre al usuario, usá `name` (y `ascii` si existe). No uses el nombre como clave primaria.

No existe un estándar ISO global para identificar todas las ciudades del mundo. ISO 3166-1 identifica países e ISO 3166-2 identifica provincias/estados; para localidades, GeoNames es una de las fuentes abiertas más usadas. Por eso el proyecto combina ambos: ISO para la jerarquía administrativa y GeoNames ID para cada localidad.

Cuando una división no tiene código ISO, se usa el código `admin1` de GeoNames. En la versión actual, las 508 divisiones tienen código ISO.

---

## 🧾 Esquema de datos

### País (`data/countries.json`)

```json
{
  "code": "AR",
  "code3": "ARG",
  "numeric": "032",
  "name": "Argentina",
  "name_es": "Argentina",
  "flag": "🇦🇷",
  "capital": "Buenos Aires",
  "continent": "SA",
  "continent_name": "América del Sur",
  "region": "América",
  "subregion": "América del Sur",
  "phone": "+54",
  "currency": "ARS",
  "currency_name": "Peso",
  "languages": ["es-AR", "en", "it", "de", "fr", "gn"],
  "population": 45851378,
  "area_km2": 2766890,
  "lat": -34,
  "lng": -64,
  "geoname_id": 3865483
}
```

### Provincia / estado (`data/states/AR.json`)

```json
{
  "code": "Y",
  "iso": "AR-Y",
  "name": "Jujuy",
  "type": "provincia",
  "admin1": "10",
  "id": 3853404,
  "lat": -23,
  "lng": -66,
  "timezone": "America/Argentina/Jujuy",
  "population": 797955,
  "cities_count": 460
}
```

- `code`: código usado en la ruta `cities/{país}/{code}.json`.
- `iso`: código ISO 3166-2 completo (puede ser `null`).
- `admin1`: código interno de GeoNames.
- `cities_count`: cantidad de ciudades en el archivo correspondiente.

### Ciudad / localidad (`data/cities/AR/Y.json`)

```json
{
  "id": 3867009,
  "name": "Abra Pampa",
  "lat": -22.72273,
  "lng": -65.69693,
  "population": 9425,
  "fcode": "PPLA2",
  "municipality": "Departamento de Cochinoca"
}
```

Campos:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | number | ID de GeoNames. Único dentro de la localidad. |
| `name` | string | Nombre de la localidad. |
| `ascii` | string? | Nombre sin acentos. Solo aparece si difiere de `name`. |
| `lat`, `lng` | number | Coordenadas en grados decimales (WGS84). |
| `population` | number | Población según GeoNames. `0` significa desconocida o no informada. |
| `fcode` | string | Código de tipo de lugar de GeoNames. |
| `municipality` | string? | Municipio/departamento/partido, cuando GeoNames lo informa. |
| `timezone` | string? | Zona horaria. Solo aparece si difiere de la zona horaria del estado. |

### Códigos `fcode` más frecuentes

| Código | Significado |
|---|---|
| `PPLC` | Capital nacional |
| `PPLA` | Capital de una división administrativa de primer nivel |
| `PPLA2` | Cabecera de una división de segundo nivel (municipio, partido, etc.) |
| `PPLA3`, `PPLA4`, `PPLA5` | Cabeceras de divisiones de tercer, cuarto y quinto nivel |
| `PPL` | Ciudad, pueblo o localidad |
| `PPLF` | Aldea o finca |
| `PPLG` | Sede de gobierno |
| `PPLL` | Localidad |
| `PPLR` | Comunidad religiosa |
| `PPLS` | Caserío |

No se incluyen:

- `PPLX`: barrios o secciones urbanas.
- `PPLQ`: lugares abandonados.
- `PPLW`: lugares destruidos.
- `PPLH`: lugares históricos.

Esto mantiene el dataset enfocado en localidades pobladas y evita duplicar barrios dentro de una misma ciudad.

---

## 🔎 Cómo filtrar

### Solo ciudades principales

```js
const mainCities = cities.filter((city) => city.population >= 10000);
```

### Solo capitales de provincia o país

```js
const capitals = cities.filter((city) => ['PPLC', 'PPLA'].includes(city.fcode));
```

### Solo localidades con población informada

```js
const withPopulation = cities.filter((city) => city.population > 0);
```

### Ordenar por población

```js
const byPopulation = [...cities].sort((a, b) => b.population - a.population);
```

---

## 🔄 Regenerar los datos

El repositorio incluye el generador y el validador:

```bash
# Requiere Node.js 18+ y tar o unzip
node scripts/build.js

# Valida que los archivos generados sean consistentes
node scripts/validate.js
```

El generador:

1. Descarga las fuentes de GeoNames en `.cache/geonames/` (ignorado por git).
2. Lee `countryInfo.txt`, `admin1CodesASCII.txt`, `admin2Codes.txt` y `allCountries.txt`.
3. Filtra los países configurados y las localidades pobladas.
4. Escribe `data/countries.json`, `data/states/*.json`, `data/cities/**/*.json` y `data/index.json`.

Para regenerar solo algunos países:

```bash
node scripts/build.js --countries=AR,BO,BR
```

### Agregar un país nuevo

1. Agregá el código ISO del país a `DEFAULT_COUNTRIES` en `scripts/build.js`.
2. Agregá sus provincias/estados a `scripts/data/state-map.json`.
3. Ejecutá `node scripts/build.js --countries=XX`.
4. Ejecutá `node scripts/validate.js`.

El mapa de estados contiene el código `admin1` de GeoNames, el código ISO 3166-2, el nombre para mostrar y el tipo de división. Es el único archivo que hay que editar manualmente para sumar países.

---

## 🛡️ Validación y seguridad

Este repositorio es una **fuente de datos**, no un servicio de validación. Aun así, los datos están normalizados para que puedas validar del lado del servidor:

- Códigos de país ISO 3166-1 alpha-2.
- Códigos de provincia ISO 3166-2 cuando existen.
- IDs de GeoNames únicos para cada localidad.
- Coordenadas y población numéricas.
- `scripts/validate.js` verifica duplicados, campos faltantes y conteos.

Ejemplo de validación en Laravel:

```php
$country = Country::where('code', $request->country)->first();
if (!$country) {
    return response()->json(['error' => 'País inválido'], 422);
}

$state = State::where('country_code', $country->code)
    ->where('code', $request->state)
    ->first();
if (!$state) {
    return response()->json(['error' => 'Provincia inválida'], 422);
}

$city = City::where('state_code', $state->code)
    ->where('id', $request->city_id)
    ->first();
if (!$city) {
    return response()->json(['error' => 'Ciudad inválida'], 422);
}
```

> No confíes únicamente en los valores que envía el navegador. Validá siempre contra los datos del servidor.

---

## 📚 Fuentes y licencias

### Datos

- **[GeoNames](https://www.geonames.org/)** — fuente principal de países, divisiones administrativas, localidades, coordenadas y población.
  Licencia: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **[iso-3166-2.js](https://github.com/olahol/iso-3166-2.js)** — códigos y nombres de subdivisiones ISO 3166-2.
  Licencia: MIT.
- **[umpirsky/country-list](https://github.com/umpirsky/country-list)** — nombres de países en español.
  Licencia: MIT.

Los datos de este repositorio se distribuyen bajo **CC BY 4.0**. Si los usás, tenés que atribuir a World Geo Data y a GeoNames. Ver [`LICENSE-DATA`](LICENSE-DATA) y [`docs/SOURCES.md`](docs/SOURCES.md).

### Código

El generador, el validador y los ejemplos se distribuyen bajo **MIT**. Ver [`LICENSE`](LICENSE).

> GeoNames es una base colaborativa: puede contener errores, nombres desactualizados o localidades con población desconocida. Para usos legales, electorales o administrativos, contrastá con la fuente oficial del país.

---

## 🤝 Contribuir

Las contribuciones son bienvenidas:

1. Hacé un fork del repositorio.
2. Creá una rama: `git checkout -b fix/nombre-descriptivo`.
3. Si corregís datos generados, editá la fuente correspondiente (`scripts/data/state-map.json` o `scripts/build.js`) y volvé a generar.
4. Ejecutá `node scripts/validate.js`.
5. Abrí un Pull Request explicando el cambio y la fuente.

No edites manualmente los archivos de `data/` si el cambio se puede reproducir con el generador: en la próxima regeneración se perdería.

Leé [`CONTRIBUTING.md`](CONTRIBUTING.md) para más detalles.

---

## ❓ Preguntas frecuentes

**¿Es gratis?**
Sí. El código es MIT y los datos son CC BY 4.0. Solo pedimos atribución.

**¿Por qué todavía no hay ciudades de todos los países?**
Esta primera etapa cubre América Latina y el Caribe. El generador ya está preparado para sumar más países agregando su mapa de estados.

**¿Incluye barrios?**
No. Se excluyen los códigos `PPLX` para evitar duplicar barrios dentro de una ciudad. Si necesitás barrios, se puede agregar una capa separada.

**¿Los datos se actualizan?**
Sí. La fecha de generación está en `data/index.json`. Para actualizar, ejecutá `node scripts/build.js`.

**¿Puedo usarlo en producción?**
Sí, con atribución y validación del lado del servidor. Revisá la sección de licencias.

**¿Cómo sé si una localidad es capital?**
Mirá el campo `fcode`: `PPLC` es capital nacional y `PPLA` es capital de provincia/estado.

**¿Por qué una localidad tiene `population: 0`?**
Porque GeoNames no informa su población. No significa que esté deshabitada.

**¿Puedo usar solo los nombres para un select?**
Sí:

```js
const names = cities.map((city) => city.name);
```

---

## 🗺️ Roadmap

- [x] Países de todo el mundo.
- [x] Provincias/estados y ciudades de América Latina y el Caribe.
- [ ] Ciudades de América del Norte, Europa, Asia, África y Oceanía.
- [ ] Municipios y divisiones de segundo nivel como archivos separados.
- [ ] Códigos postales.
- [ ] Índice de búsqueda por nombre normalizado.
- [ ] Traducciones de nombres de localidades.
- [ ] API estática documentada con ejemplos para más lenguajes.

---

## 📸 Capturas

### Vista escritorio

<a href="https://postimages.org/" target="_blank"><img src="https://i.postimg.cc/7PJ05XMn/location1.png" alt="Vista escritorio" /></a>

### Vista móvil

<a href="https://postimages.org/" target="_blank"><img src="https://i.postimg.cc/dQZrhnm9/location2.png" alt="Vista móvil" /></a>
