# API estática

World Geo Data no requiere un servidor propio: los datos se sirven como archivos JSON desde GitHub. Podés consumirlos con `fetch`, `requests`, `curl`, `file_get_contents` o cualquier cliente HTTP.

## URL base

```text
https://raw.githubusercontent.com/kredensir/world-geo-data/main/data
```

Si hacés un fork, reemplazá `kredensir` por tu usuario.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/countries.json` | Todos los países. |
| `GET` | `/index.json` | Metadatos, cobertura y conteos. |
| `GET` | `/states/{CC}.json` | Provincias/estados de un país. |
| `GET` | `/cities/{CC}/{STATE}.json` | Ciudades/localidades de una provincia. |

### Ejemplos

```http
GET /countries.json
GET /states/AR.json
GET /cities/AR/Y.json
GET /cities/BR/SP.json
GET /cities/MX/CMX.json
```

### Respuestas

`countries.json`:

```json
[
  {
    "code": "AR",
    "name_es": "Argentina",
    "flag": "🇦🇷",
    "capital": "Buenos Aires"
  }
]
```

`states/AR.json`:

```json
[
  {
    "code": "Y",
    "iso": "AR-Y",
    "name": "Jujuy",
    "type": "provincia",
    "cities_count": 460
  }
]
```

`cities/AR/Y.json`:

```json
[
  {
    "id": 3867009,
    "name": "Abra Pampa",
    "lat": -22.72273,
    "lng": -65.69693,
    "population": 9425,
    "fcode": "PPLA2"
  }
]
```

## Códigos de estado HTTP

- `200`: archivo encontrado.
- `404`: país o provincia sin datos en esta etapa.

Siempre verificá `response.ok` antes de parsear el JSON.

## Caché

GitHub sirve los archivos con caché y compresión. Para producción, se recomienda:

1. Descargar los archivos que necesites en tu build o en un job programado.
2. Guardarlos en tu propio CDN o en `resources/`.
3. Validar la fecha de `index.json` para saber si hay una versión nueva.

## CORS

`raw.githubusercontent.com` permite solicitudes desde navegador. Si tenés problemas de CORS o de rate limit, descargá los archivos y servilos desde tu dominio.

## Consumo desde Laravel

Ver [`examples/laravel-integration.md`](../examples/laravel-integration.md).

## Consumo desde JavaScript

```js
const BASE = 'https://raw.githubusercontent.com/kredensir/world-geo-data/main/data';

async function getCities(country, state) {
  const response = await fetch(`${BASE}/cities/${country}/${state}.json`);
  if (!response.ok) return [];
  return response.json();
}

const jujuy = await getCities('AR', 'Y');
```

## Consumo desde Python

```python
import requests

BASE = "https://raw.githubusercontent.com/kredensir/world-geo-data/main/data"

def get_cities(country: str, state: str) -> list[dict]:
    response = requests.get(f"{BASE}/cities/{country}/{state}.json", timeout=30)
    if response.status_code == 404:
        return []
    response.raise_for_status()
    return response.json()

ciudades = get_cities("AR", "Y")
```
