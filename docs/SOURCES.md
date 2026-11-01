# Fuentes y atribuciones

World Geo Data combina datos abiertos de varias fuentes. Esta página documenta el origen de cada campo y las licencias aplicables.

## GeoNames

- Sitio: <https://www.geonames.org/>
- Descargas: <https://download.geonames.org/export/dump/>
- Licencia: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Archivos utilizados:

| Archivo | Uso |
|---|---|
| `countryInfo.txt` | Códigos ISO, nombre, capital, población, área, moneda, idioma y continente de los países. |
| `admin1CodesASCII.txt` | Divisiones administrativas de primer nivel (provincias, estados, departamentos). |
| `admin2Codes.txt` | Municipios, partidos y divisiones de segundo nivel (campo `municipality`). |
| `allCountries.txt` | Localidades, coordenadas, población, zona horaria y tipo de lugar (`fcode`). |

GeoNames es una base colaborativa. La población puede ser estimada, estar desactualizada o ser `0` cuando no se informa.

## iso-3166-2.js

- Repositorio: <https://github.com/olahol/iso-3166-2.js>
- Licencia: MIT

Se usa para los códigos y nombres de subdivisiones ISO 3166-2. Algunos códigos nuevos o nombres desactualizados se corrigieron manualmente en `scripts/data/state-map.json`:

- `CL-NB` (Ñuble, Chile).
- `PA-NT` (Naso Tjër Di, Panamá).
- Nombres actualizados de provincias de República Dominicana, Perú, Panamá y Venezuela.
- Municipios de Puerto Rico (`PR-001` a `PR-153`).

## umpirsky/country-list

- Repositorio: <https://github.com/umpirsky/country-list>
- Licencia: MIT

Se usa para el campo `name_es` de los países. Cuando un país no tiene traducción en esa lista, se usa el nombre en inglés de GeoNames.

## Datos corregidos manualmente

`scripts/data/state-map.json` contiene la relación entre:

- El código `admin1` de GeoNames.
- El código ISO 3166-2.
- El nombre para mostrar.
- El tipo de división (provincia, estado, departamento, región, etc.).

Esta relación se revisó para los 25 países incluidos. Si encontrás un error, abrí un issue o un Pull Request indicando la fuente oficial.

`scripts/data/city-overrides.json` contiene correcciones puntuales de localidades (por ejemplo, una localidad asignada a la provincia equivocada). Se aplican por `geonameid` durante la generación.

## Atribución sugerida

Si publicás un proyecto que usa estos datos:

```text
Datos geográficos: World Geo Data
https://github.com/kredensir/world-geo-data
Basado en GeoNames (https://www.geonames.org/), CC BY 4.0.
Códigos ISO 3166-2: iso-3166-2.js (MIT).
Nombres de países en español: umpirsky/country-list (MIT).
```

## Limitaciones

- No es una fuente oficial de límites políticos ni de población.
- Algunas localidades pueden tener nombres alternativos, errores de coordenadas o estar asignadas a la provincia equivocada.
- Los barrios (`PPLX`) no están incluidos.
- Los lugares abandonados, destruidos o históricos (`PPLQ`, `PPLW`, `PPLH`) no están incluidos.
- Para usos legales, electorales o administrativos, contrastá con la fuente oficial del país.
