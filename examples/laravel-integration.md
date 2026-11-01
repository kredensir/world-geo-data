# Integración con Laravel

Guía para usar World Geo Data en un formulario de país / provincia / ciudad con validación del lado del servidor.

## Requisitos

- Laravel 9 o superior.
- PHP 8.0 o superior.
- Conexión a internet para descargar los JSON (o copiarlos a `resources/geo/`).

## 1. Controlador

```bash
php artisan make:controller Api/LocationController
```

`app/Http/Controllers/Api/LocationController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LocationController extends Controller
{
    private const BASE_URL = 'https://raw.githubusercontent.com/kredensir/world-geo-data/main/data';
    private const CACHE_SECONDS = 86400;

    public function countries(): JsonResponse
    {
        return response()->json($this->getJson('countries.json'));
    }

    public function states(string $country): JsonResponse
    {
        $country = strtoupper($country);

        if (!preg_match('/^[A-Z]{2}$/', $country)) {
            return response()->json(['error' => 'País inválido'], 422);
        }

        return response()->json($this->getJson("states/{$country}.json"));
    }

    public function cities(string $country, string $state): JsonResponse
    {
        $country = strtoupper($country);
        $state = strtoupper($state);

        if (!preg_match('/^[A-Z]{2}$/', $country) || !preg_match('/^[A-Z0-9-]{1,8}$/', $state)) {
            return response()->json(['error' => 'Ubicación inválida'], 422);
        }

        return response()->json($this->getJson("cities/{$country}/{$state}.json"));
    }

    private function getJson(string $path): array
    {
        return Cache::remember(
            'geo:' . md5($path),
            self::CACHE_SECONDS,
            function () use ($path) {
                $local = resource_path("geo/{$path}");

                if (is_file($local)) {
                    return json_decode(file_get_contents($local), true) ?: [];
                }

                try {
                    $response = Http::timeout(10)->get(self::BASE_URL . '/' . $path);

                    if ($response->successful()) {
                        return $response->json() ?: [];
                    }

                    Log::warning("World Geo Data: HTTP {$response->status()} en {$path}");
                } catch (\Throwable $e) {
                    Log::warning("World Geo Data: error al descargar {$path}: {$e->getMessage()}");
                }

                return [];
            }
        );
    }
}
```

## 2. Rutas

`routes/api.php`:

```php
use App\Http\Controllers\Api\LocationController;

Route::get('/locations/countries', [LocationController::class, 'countries']);
Route::get('/locations/countries/{country}/states', [LocationController::class, 'states']);
Route::get('/locations/countries/{country}/states/{state}/cities', [LocationController::class, 'cities']);
```

## 3. Frontend con Blade + JavaScript

```blade
<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div>
        <label for="country">País *</label>
        <select id="country" name="country" required>
            <option value="">Seleccionar país</option>
        </select>
    </div>

    <div>
        <label for="state">Provincia *</label>
        <select id="state" name="state" required disabled>
            <option value="">Primero seleccioná un país</option>
        </select>
    </div>

    <div>
        <label for="city">Ciudad *</label>
        <select id="city" name="city_id" required disabled>
            <option value="">Primero seleccioná una provincia</option>
        </select>
    </div>
</div>

<script>
const API = '/api/locations';
const country = document.getElementById('country');
const state = document.getElementById('state');
const city = document.getElementById('city');

const reset = (select, text) => {
    select.innerHTML = `<option value="">${text}</option>`;
    select.disabled = true;
};

fetch(`${API}/countries`)
    .then((response) => response.json())
    .then((countries) => {
        for (const item of countries) {
            country.add(new Option(`${item.flag} ${item.name_es}`, item.code));
        }
    });

country.addEventListener('change', async () => {
    reset(state, 'Seleccionar provincia');
    reset(city, 'Primero seleccioná una provincia');

    if (!country.value) return;

    const response = await fetch(`${API}/countries/${country.value}/states`);
    const states = await response.json();

    for (const item of states) {
        state.add(new Option(item.name, item.code));
    }
    state.disabled = false;
});

state.addEventListener('change', async () => {
    reset(city, 'Seleccionar ciudad');

    if (!state.value) return;

    const response = await fetch(`${API}/countries/${country.value}/states/${state.value}/cities`);
    const cities = await response.json();

    for (const item of cities) {
        const label = item.population > 0
            ? `${item.name} (${item.population.toLocaleString('es')})`
            : item.name;

        city.add(new Option(label, item.id));
    }
    city.disabled = false;
});
</script>
```

## 4. Validación en el servidor

No confíes en los valores que envía el navegador. Validá el país, la provincia y la ciudad contra los datos:

```php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

public function store(Request $request)
{
    $validated = $request->validate([
        'country' => ['required', 'string', 'size:2'],
        'state' => ['required', 'string', 'max:8'],
        'city_id' => ['required', 'integer'],
    ]);

    $country = strtoupper($validated['country']);
    $state = strtoupper($validated['state']);

    $states = Cache::remember("geo:states:{$country}", 86400, function () use ($country) {
        return Http::timeout(10)
            ->get("https://raw.githubusercontent.com/kredensir/world-geo-data/main/data/states/{$country}.json")
            ->json() ?: [];
    });

    $stateExists = collect($states)->contains('code', $state);

    if (!$stateExists) {
        return response()->json(['error' => 'Provincia inválida'], 422);
    }

    $cities = Cache::remember("geo:cities:{$country}:{$state}", 86400, function () use ($country, $state) {
        return Http::timeout(10)
            ->get("https://raw.githubusercontent.com/kredensir/world-geo-data/main/data/cities/{$country}/{$state}.json")
            ->json() ?: [];
    });

    $cityExists = collect($cities)->contains('id', (int) $validated['city_id']);

    if (!$cityExists) {
        return response()->json(['error' => 'Ciudad inválida'], 422);
    }

    // Guardar la ubicación...
}
```

## 5. Copiar los datos al proyecto (opcional)

Para evitar depender de GitHub en producción, descargá solo los países que necesitás:

```bash
mkdir -p resources/geo/states resources/geo/cities/AR

curl -L -o resources/geo/countries.json \
  https://raw.githubusercontent.com/kredensir/world-geo-data/main/data/countries.json

curl -L -o resources/geo/states/AR.json \
  https://raw.githubusercontent.com/kredensir/world-geo-data/main/data/states/AR.json

curl -L -o resources/geo/cities/AR/Y.json \
  https://raw.githubusercontent.com/kredensir/world-geo-data/main/data/cities/AR/Y.json
```

El controlador de ejemplo ya busca primero en `resources/geo/` y usa GitHub solo como respaldo.

## 6. Notas

- `city_id` es el `id` de GeoNames y es único para cada localidad.
- `population: 0` significa que la población no está informada; no filtres por población si necesitás todas las localidades.
- Para un select más liviano, filtrá en el servidor:

```php
$cities = array_values(array_filter($cities, fn ($city) => $city['population'] >= 1000));
```

- Si necesitás el nombre de la provincia en la ciudad, agregalo en tu respuesta o uní los datos en el cliente.
