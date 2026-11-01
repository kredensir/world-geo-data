# World Geo Data 🌎

**Languages:** [English](README.md) · [Español](README.es.md)

[![License: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/Data-CC%20BY%204.0-lightgrey.svg)](LICENSE-DATA)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

An open geographic database of **countries, provinces/states and cities**, designed to be consumed as static JSON from any language or framework.

The project started with partial data for Argentina and now includes:

- 🌍 **250 countries** with ISO codes, flag, capital, currency, languages, population and coordinates.
- 🗺️ **508 provinces/states** across **25 countries in Latin America and the Caribbean**.
- 🏙️ **585,789 cities and localities** in those countries, generated from GeoNames.

> **Goal:** progressively cover every country in the world with as many localities as possible, without depending on a proprietary API.

> **Documentation:** this README is available in English and Spanish. The detailed schema and API documents are currently in Spanish; translations are welcome.

---

## 📦 Current coverage

| Region | Countries | Provinces/states | Cities/localities |
|---|---:|---:|---:|
| Latin America and the Caribbean | 25 | 508 | 585,789 |
| Rest of the world | 225 | — | — |
| **Total countries** | **250** | **508** | **585,789** |

Countries included in this first phase:

`AR` Argentina · `BO` Bolivia · `BR` Brazil · `BZ` Belize · `CL` Chile · `CO` Colombia · `CR` Costa Rica · `CU` Cuba · `DO` Dominican Republic · `EC` Ecuador · `SV` El Salvador · `GF` French Guiana · `GT` Guatemala · `GY` Guyana · `HT` Haiti · `HN` Honduras · `MX` Mexico · `NI` Nicaragua · `PA` Panama · `PE` Peru · `PR` Puerto Rico · `PY` Paraguay · `SR` Suriname · `UY` Uruguay · `VE` Venezuela

Some examples of the improvement over the previous version:

| Country / province | Before | Now |
|---|---:|---:|
| Argentina | ~2,000 localities | **14,582** |
| Jujuy (AR) | 88 localities | **460** |
| Bolivia | 0 localities | **25,625** |
| Brazil | 0 localities | **66,843** |
| Mexico | 0 localities | **265,545** |

Exact counts and the generation timestamp are in [`data/index.json`](data/index.json).

> **Note:** the Naso Tjër Di comarca (`PA-NT`) appears as a state with 0 localities because GeoNames does not yet assign cities to that division. The file `data/cities/PA/NT.json` exists and is empty to keep the structure consistent.

---

## 🚀 Quick start

All files are public JSON. You can consume them directly from GitHub:

```js
const BASE = 'https://raw.githubusercontent.com/kredensir/world-geo-data/main/data';

// 1. Countries
const countries = await fetch(`${BASE}/countries.json`).then((r) => r.json());

// 2. Provinces/states of Argentina
const states = await fetch(`${BASE}/states/AR.json`).then((r) => r.json());

// 3. Cities of Jujuy (AR-Y)
const cities = await fetch(`${BASE}/cities/AR/Y.json`).then((r) => r.json());

console.log(cities.map((city) => city.name));
```

### Chained selects example

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
    countrySelect.innerHTML = '<option value="">Select a country</option>';
    for (const country of countries) {
      countrySelect.innerHTML += `<option value="${country.code}">${country.flag} ${country.name}</option>`;
    }
  });

countrySelect.addEventListener('change', async () => {
  stateSelect.disabled = true;
  citySelect.disabled = true;
  stateSelect.innerHTML = '<option value="">Select a province/state</option>';

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
  citySelect.innerHTML = '<option value="">Select a city</option>';

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

print(countries[0]["name"])
print(states[0]["name"])
print(cities[0]["name"])
```

### Laravel / PHP

See the full guide in [`examples/laravel-integration.md`](examples/laravel-integration.md).

---

## 🗂️ Repository structure

```text
data/
├── countries.json              # 250 countries
├── index.json                  # metadata, coverage and counts
├── states/
│   ├── AR.json                 # provinces of Argentina
│   ├── BO.json                 # departments of Bolivia
│   └── ...
└── cities/
    ├── AR/
    │   ├── A.json              # cities of Salta
    │   ├── B.json              # cities of Buenos Aires
    │   ├── Y.json              # cities of Jujuy
    │   └── ...
    ├── BO/
    │   └── ...
    └── ...
```

### How are files and cities identified?

Files in `data/cities/` are **not one file per city**: they are one file per province/state containing all localities of that division. The filename is the **ISO 3166-2 code of the province without the country prefix**:

- `AR-B` → `data/cities/AR/B.json`
- `BR-SP` → `data/cities/BR/SP.json`
- `MX-CMX` → `data/cities/MX/CMX.json`
- `CO-ANT` → `data/cities/CO/ANT.json`
- `PR-001` → `data/cities/PR/001.json`
- `PA-1` → `data/cities/PA/1.json`

The full ISO code is stored in the `iso` field of `data/states/{CC}.json`. For example, `data/cities/AR/Y.json` corresponds to `AR-Y` (Jujuy), and `data/states/AR.json` contains `"iso": "AR-Y"`. The path `data/cities/AR/Y.json` reconstructs the full code because the country is the parent directory.

### Why not use the city name as the filename?

Because names are neither stable nor unique identifiers:

- There are homonymous cities in different provinces and countries.
- They contain accents, spaces, apostrophes and characters that behave differently across filesystems.
- Windows and macOS filesystems are case-insensitive by default.
- Names can change over time; the GeoNames ID does not.
- It would create hundreds of thousands of tiny files instead of files grouped by province.

Every city has an `id` field with its **GeoNames ID**, which is unique and stable. That is the recommended identifier for a locality. To display a name to users, use `name` (and `ascii` when present). Do not use the name as a primary key.

There is no global ISO standard for identifying every city in the world. ISO 3166-1 identifies countries and ISO 3166-2 identifies provinces/states; for localities, GeoNames is one of the most widely used open sources. This project combines both: ISO for the administrative hierarchy and GeoNames ID for each locality.

When a division has no ISO code, the GeoNames `admin1` code is used. In the current version, all 508 divisions have an ISO code.

---

## 🧾 Data schema

### Country (`data/countries.json`)

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

### Province / state (`data/states/AR.json`)

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

- `code`: code used in the path `cities/{country}/{code}.json`.
- `iso`: full ISO 3166-2 code (may be `null`).
- `admin1`: GeoNames internal code.
- `cities_count`: number of cities in the corresponding file.

### City / locality (`data/cities/AR/Y.json`)

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

Fields:

| Field | Type | Description |
|---|---|---|
| `id` | number | GeoNames ID. Unique for each locality. |
| `name` | string | Locality name. |
| `ascii` | string? | Name without accents. Only present when it differs from `name`. |
| `lat`, `lng` | number | Coordinates in decimal degrees (WGS84). |
| `population` | number | Population according to GeoNames. `0` means unknown or not reported. |
| `fcode` | string | GeoNames feature code. |
| `municipality` | string? | Municipality/department/partido, when GeoNames reports it. |
| `timezone` | string? | Timezone. Only present when it differs from the state timezone. |

### Most common `fcode` values

| Code | Meaning |
|---|---|
| `PPLC` | National capital |
| `PPLA` | Capital of a first-level administrative division |
| `PPLA2` | Seat of a second-level division (municipality, partido, etc.) |
| `PPLA3`, `PPLA4`, `PPLA5` | Seats of third-, fourth- and fifth-level divisions |
| `PPL` | City, town or locality |
| `PPLF` | Farm village |
| `PPLG` | Seat of government |
| `PPLL` | Locality |
| `PPLR` | Religious community |
| `PPLS` | Hamlet |

Not included:

- `PPLX`: city districts or urban sections.
- `PPLQ`: abandoned places.
- `PPLW`: destroyed places.
- `PPLH`: historical places.

This keeps the dataset focused on populated localities and avoids duplicating neighborhoods inside the same city.

---

## 🔎 Filtering

### Main cities only

```js
const mainCities = cities.filter((city) => city.population >= 10000);
```

### Provincial or national capitals only

```js
const capitals = cities.filter((city) => ['PPLC', 'PPLA'].includes(city.fcode));
```

### Localities with a reported population only

```js
const withPopulation = cities.filter((city) => city.population > 0);
```

### Sort by population

```js
const byPopulation = [...cities].sort((a, b) => b.population - a.population);
```

---

## 🔄 Regenerating the data

The repository includes the generator and validator:

```bash
# Requires Node.js 18+ and tar or unzip
node scripts/build.js

# Validate that the generated files are consistent
node scripts/validate.js
```

The generator:

1. Downloads the GeoNames sources into `.cache/geonames/` (ignored by git).
2. Reads `countryInfo.txt`, `admin1CodesASCII.txt`, `admin2Codes.txt` and `allCountries.txt`.
3. Filters the configured countries and populated localities.
4. Writes `data/countries.json`, `data/states/*.json`, `data/cities/**/*.json` and `data/index.json`.

To regenerate only some countries:

```bash
node scripts/build.js --countries=AR,BO,BR
```

### Adding a new country

1. Add the country's ISO code to `DEFAULT_COUNTRIES` in `scripts/build.js`.
2. Add its provinces/states to `scripts/data/state-map.json`.
3. Run `node scripts/build.js --countries=XX`.
4. Run `node scripts/validate.js`.

The state map contains the GeoNames `admin1` code, the ISO 3166-2 code, the display name and the division type. It is the only file that must be edited manually to add countries.

---

## 🛡️ Validation and security

This repository is a **data source**, not a validation service. Still, the data is normalized so you can validate on the server:

- ISO 3166-1 alpha-2 country codes.
- ISO 3166-2 province codes when available.
- Unique GeoNames IDs for each locality.
- Numeric coordinates and population.
- `scripts/validate.js` checks duplicates, missing fields and counts.

Laravel validation example:

```php
$country = Country::where('code', $request->country)->first();
if (!$country) {
    return response()->json(['error' => 'Invalid country'], 422);
}

$state = State::where('country_code', $country->code)
    ->where('code', $request->state)
    ->first();
if (!$state) {
    return response()->json(['error' => 'Invalid province/state'], 422);
}

$city = City::where('state_code', $state->code)
    ->where('id', $request->city_id)
    ->first();
if (!$city) {
    return response()->json(['error' => 'Invalid city'], 422);
}
```

> Do not trust values sent by the browser alone. Always validate against the server-side data.

---

## 📚 Sources and licenses

### Data

- **[GeoNames](https://www.geonames.org/)** — main source of countries, administrative divisions, localities, coordinates and population.
  License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **[iso-3166-2.js](https://github.com/olahol/iso-3166-2.js)** — ISO 3166-2 subdivision codes and names.
  License: MIT.
- **[umpirsky/country-list](https://github.com/umpirsky/country-list)** — country names in Spanish.
  License: MIT.

The data in this repository is distributed under **CC BY 4.0**. If you use it, you must attribute World Geo Data and GeoNames. See [`LICENSE-DATA`](LICENSE-DATA) and [`docs/SOURCES.md`](docs/SOURCES.md).

### Code

The generator, validator and examples are distributed under **MIT**. See [`LICENSE`](LICENSE).

> GeoNames is a collaborative database: it may contain errors, outdated names or localities with unknown population. For legal, electoral or administrative uses, cross-check with the official source for each country.

---

## 🤝 Contributing

Contributions are welcome:

1. Fork the repository.
2. Create a branch: `git checkout -b fix/descriptive-name`.
3. If you are fixing generated data, edit the corresponding source (`scripts/data/state-map.json`, `scripts/data/city-overrides.json` or `scripts/build.js`) and regenerate.
4. Run `node scripts/validate.js`.
5. Open a Pull Request explaining the change and the source.

Do not edit files in `data/` manually if the change can be reproduced with the generator: it would be lost on the next regeneration.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

---

## ❓ FAQ

**Is it free?**
Yes. The code is MIT and the data is CC BY 4.0. We only ask for attribution.

**Why are there no cities for every country yet?**
This first phase covers Latin America and the Caribbean. The generator is already prepared to add more countries by adding their state map.

**Does it include neighborhoods?**
No. `PPLX` codes are excluded to avoid duplicating neighborhoods inside a city. If you need neighborhoods, a separate layer can be added.

**Is the data updated?**
Yes. The generation date is in `data/index.json`. To update, run `node scripts/build.js`.

**Can I use it in production?**
Yes, with attribution and server-side validation. See the licenses section.

**How do I know whether a locality is a capital?**
Check the `fcode` field: `PPLC` is a national capital and `PPLA` is a province/state capital.

**Why does a locality have `population: 0`?**
Because GeoNames does not report its population. It does not mean the place is uninhabited.

**Can I use only the names for a select?**
Yes:

```js
const names = cities.map((city) => city.name);
```

---

## 🗺️ Roadmap

- [x] Countries worldwide.
- [x] Provinces/states and cities for Latin America and the Caribbean.
- [ ] Cities for North America, Europe, Asia, Africa and Oceania.
- [ ] Municipalities and second-level divisions as separate files.
- [ ] Postal codes.
- [ ] Search index by normalized name.
- [ ] Translations of locality names.
- [ ] Documented static API with examples for more languages.

---

## 📸 Screenshots

### Desktop view

<a href="https://postimages.org/" target="_blank"><img src="https://i.postimg.cc/7PJ05XMn/location1.png" alt="Desktop view" /></a>

### Mobile view

<a href="https://postimages.org/" target="_blank"><img src="https://i.postimg.cc/dQZrhnm9/location2.png" alt="Mobile view" /></a>
