#!/usr/bin/env node
/**
 * World Geo Data - generador de datos
 *
 * Fuente principal: GeoNames (https://www.geonames.org/)
 * Fuente de codigos ISO 3166-2: proyecto iso-3166-2.js (MIT)
 * Nombres de paises en espanol: umpirsky/country-list (MIT)
 *
 * Uso:
 *   node scripts/build.js
 *   node scripts/build.js --countries=AR,BO,BR
 *
 * Los archivos fuente se descargan en .cache/geonames/ (ignorado por git).
 * Para extraer allCountries.zip se necesita `tar` (Windows/macOS/Linux) o `unzip`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, '.cache', 'geonames');
const DATA = path.join(ROOT, 'data');
const STATE_MAP_PATH = path.join(__dirname, 'data', 'state-map.json');
const CITY_OVERRIDES_PATH = path.join(__dirname, 'data', 'city-overrides.json');

// Países incluidos en esta primera etapa: América Latina y el Caribe.
// Se puede ampliar con --countries=...
const DEFAULT_COUNTRIES = [
  'AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV',
  'GT', 'HN', 'HT', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'UY',
  'VE', 'BZ', 'GY', 'SR', 'GF',
];

// Codigos de lugares poblados que consideramos ciudades/localidades.
// Se excluyen PPLX (barrios/secciones urbanas), PPLQ (abandonados),
// PPLW (destruidos) y PPLH (historicos).
const CITY_FCODES = new Set([
  'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5',
  'PPLC', 'PPLF', 'PPLG', 'PPLL', 'PPLR', 'PPLS',
]);

const CONTINENTS = {
  AF: 'África',
  AN: 'Antártida',
  AS: 'Asia',
  EU: 'Europa',
  NA: 'América del Norte',
  OC: 'Oceanía',
  SA: 'América del Sur',
};

const CONTINENT_CODES = {
  AF: 'África',
  AN: 'Antártida',
  AS: 'Asia',
  EU: 'Europa',
  NA: 'América',
  OC: 'Oceanía',
  SA: 'América',
};

// Nombres en español que la lista de umpirsky trae en otro idioma o
// que conviene normalizar para este proyecto.
const COUNTRY_NAME_ES_OVERRIDES = {
  CI: 'Costa de Marfil',
};

const SOUTH_AMERICA = new Set(['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE']);
const CENTRAL_AMERICA = new Set(['BZ', 'CR', 'SV', 'GT', 'HN', 'MX', 'NI', 'PA']);
const CARIBBEAN = new Set([
  'AG', 'AI', 'AW', 'BB', 'BL', 'BQ', 'BS', 'CU', 'CW', 'DM', 'DO', 'GD', 'GP',
  'HT', 'JM', 'KN', 'KY', 'LC', 'MF', 'MQ', 'MS', 'PR', 'SX', 'TC', 'TT', 'VC',
  'VG', 'VI',
]);
const NORTHERN_AMERICA = new Set(['BM', 'CA', 'GL', 'PM', 'US']);

const SOURCES = [
  {
    name: 'GeoNames',
    url: 'https://download.geonames.org/export/dump/',
    license: 'CC BY 4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    name: 'iso-3166-2.js',
    url: 'https://github.com/olahol/iso-3166-2.js',
    license: 'MIT',
    license_url: 'https://opensource.org/licenses/MIT',
  },
  {
    name: 'umpirsky/country-list',
    url: 'https://github.com/umpirsky/country-list',
    license: 'MIT',
    license_url: 'https://opensource.org/licenses/MIT',
  },
];

function parseArgs() {
  const args = { countries: DEFAULT_COUNTRIES };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--countries=')) {
      args.countries = arg
        .slice('--countries='.length)
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean);
    } else if (arg === '--help' || arg === '-h') {
      console.log('Uso: node scripts/build.js [--countries=AR,BO,BR]');
      process.exit(0);
    } else {
      console.error(`Argumento desconocido: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function flagEmoji(iso2) {
  if (!/^[A-Z]{2}$/.test(iso2)) return '';
  return String.fromCodePoint(
    ...iso2.split('').map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  );
}

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'world-geo-data/2.0' } }, (response) => {
      const { statusCode, headers } = response;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        response.resume();
        const next = new URL(headers.location, url).href;
        resolve(download(next, destination));
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${statusCode} al descargar ${url}`));
        return;
      }

      ensureDir(path.dirname(destination));
      const file = fs.createWriteStream(destination);
      response.pipe(file);

      file.on('finish', () => {
        file.close(() => resolve(destination));
      });
      file.on('error', (error) => {
        fs.rmSync(destination, { force: true });
        reject(error);
      });
    });

    request.on('error', reject);
    request.setTimeout(120000, () => {
      request.destroy(new Error(`Timeout al descargar ${url}`));
    });
  });
}

async function ensureDownload(url, filename) {
  const destination = path.join(CACHE, filename);
  if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    return destination;
  }

  console.log(`Descargando ${filename}...`);
  await download(url, destination);
  console.log(`Listo: ${filename} (${(fs.statSync(destination).size / 1024 / 1024).toFixed(1)} MB)`);
  return destination;
}

function extractZip(zipPath, destination) {
  ensureDir(destination);
  const target = path.join(destination, 'allCountries.txt');
  if (fs.existsSync(target) && fs.statSync(target).size > 0) {
    return target;
  }

  console.log('Extrayendo allCountries.zip...');
  const attempts = [
    ['tar', ['-xf', zipPath, '-C', destination]],
    ['unzip', ['-o', zipPath, '-d', destination]],
  ];

  let lastError;
  for (const [command, args] of attempts) {
    try {
      execFileSync(command, args, { stdio: 'ignore' });
      if (fs.existsSync(target)) return target;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `No se pudo extraer ${zipPath}. Instala tar o unzip y vuelve a intentar.\n${lastError || ''}`
  );
}

function parseCountryInfo(filePath, spanishNames, countryGeo) {
  const countries = [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const fields = line.split('\t');
    if (fields.length < 17) continue;

    const [
      iso2, iso3, numeric, fips, name, capital, area, population,
      continent, tld, currency, currencyName, phone, postalFormat,
      postalRegex, languages, geonameid,
    ] = fields;

    if (!iso2) continue;
    // Codigos obsoletos que GeoNames conserva por compatibilidad.
    if (iso2 === 'CS' || iso2 === 'AN') continue;

    const id = Number.parseInt(geonameid, 10);
    const coordinates = countryGeo.get(id) || {};
    const languageList = (languages || '')
      .split(',')
      .map((language) => language.trim())
      .filter(Boolean);
    const cleanName = (name || '').trim();
    const cleanNameEs = (
      COUNTRY_NAME_ES_OVERRIDES[iso2] ||
      spanishNames[iso2] ||
      (iso2 === 'XK' ? 'Kosovo' : cleanName)
    ).trim();

    let region = CONTINENT_CODES[continent] || CONTINENTS[continent] || continent;
    let subregion = null;
    if (continent === 'SA' || SOUTH_AMERICA.has(iso2)) {
      region = 'América';
      subregion = 'América del Sur';
    } else if (CENTRAL_AMERICA.has(iso2)) {
      region = 'América';
      subregion = 'América Central';
    } else if (CARIBBEAN.has(iso2)) {
      region = 'América';
      subregion = 'Caribe';
    } else if (NORTHERN_AMERICA.has(iso2)) {
      region = 'América';
      subregion = 'América del Norte';
    }

    countries.push({
      code: iso2,
      code3: iso3,
      numeric: numeric && numeric !== '0' ? numeric : null,
      name: cleanName,
      name_es: cleanNameEs,
      flag: flagEmoji(iso2),
      capital: capital ? capital.trim() : null,
      continent,
      continent_name: CONTINENTS[continent] || null,
      region,
      subregion,
      phone: phone ? (phone.startsWith('+') ? phone.trim() : `+${phone.trim()}`) : null,
      currency: currency ? currency.trim() : null,
      currency_name: currencyName ? currencyName.trim() : null,
      languages: languageList,
      population: Number.parseInt(population, 10) || 0,
      area_km2: Number.parseFloat(area) || 0,
      lat: coordinates.lat ?? null,
      lng: coordinates.lng ?? null,
      geoname_id: Number.isNaN(id) ? null : id,
    });
  }

  countries.sort((a, b) => a.name_es.localeCompare(b.name_es, 'es', { sensitivity: 'base' }));
  return countries;
}

function parseAdmin1(filePath) {
  const admin1 = new Map();
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [code, name, asciiName, geonameid] = line.split('\t');
    if (!code || !code.includes('.')) continue;
    const [countryCode, admin1Code] = code.split('.');
    admin1.set(code, {
      countryCode,
      admin1Code,
      name: (name || '').trim(),
      asciiName: (asciiName || '').trim(),
      geonameid: Number.parseInt(geonameid, 10),
    });
  }

  return admin1;
}

function parseAdmin2(filePath) {
  const admin2 = new Map();
  if (!fs.existsSync(filePath)) return admin2;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [code, name] = line.split('\t');
    if (!code || !name) continue;
    admin2.set(code, name.trim());
  }

  return admin2;
}

async function parseAllCountries(filePath, targetCountries) {
  const cities = [];
  const admin1Geo = new Map();
  const countryGeo = new Map();

  const reader = readline.createInterface({
    input: fs.createReadStream(filePath, 'utf8'),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of reader) {
    lineNumber += 1;
    if (!line) continue;

    const fields = line.split('\t');
    if (fields.length < 19) continue;

    const [
      geonameid, name, asciiName, alternateNames, lat, lng,
      featureClass, featureCode, countryCode, cc2, admin1Code,
      admin2Code, admin3Code, admin4Code, population, elevation,
      dem, timezone,
    ] = fields;

    if (featureClass === 'A') {
      if (featureCode.startsWith('PCL') || featureCode === 'TERR') {
        countryGeo.set(Number.parseInt(geonameid, 10), {
          lat: Number.parseFloat(lat),
          lng: Number.parseFloat(lng),
        });
      }

      if (featureCode === 'ADM1' && targetCountries.has(countryCode)) {
        admin1Geo.set(Number.parseInt(geonameid, 10), {
          lat: Number.parseFloat(lat),
          lng: Number.parseFloat(lng),
          population: Number.parseInt(population, 10) || 0,
          timezone: timezone || null,
        });
      }
      continue;
    }

    if (featureClass !== 'P' || !targetCountries.has(countryCode)) continue;
    if (!CITY_FCODES.has(featureCode)) continue;

    // "00" es el codigo que usa GeoNames cuando no hay una division
    // administrativa asignada. Se trata como desconocido para poder
    // ubicar la localidad por proximidad geografica.
    const normalizedAdmin1 =
      !admin1Code || admin1Code === '00' || admin1Code === '0' ? '' : admin1Code;

    cities.push({
      id: Number.parseInt(geonameid, 10),
      name: (name || '').trim(),
      ascii: (asciiName || '').trim(),
      lat: Number.parseFloat(lat),
      lng: Number.parseFloat(lng),
      population: Number.parseInt(population, 10) || 0,
      fcode: featureCode,
      timezone: timezone || null,
      countryCode,
      admin1Code: normalizedAdmin1,
      admin2Code: admin2Code || '',
    });
  }

  console.log(`GeoNames: ${lineNumber.toLocaleString('es')} registros leidos, ${cities.length.toLocaleString('es')} ciudades seleccionadas.`);

  return { cities, admin1Geo, countryGeo };
}

function haversine(a, b) {
  const radius = 6371;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

function dominantTimezone(cities, fallback) {
  const counts = new Map();
  for (const city of cities) {
    if (!city.timezone) continue;
    counts.set(city.timezone, (counts.get(city.timezone) || 0) + 1);
  }

  let best = fallback || null;
  let bestCount = 0;
  for (const [timezone, count] of counts.entries()) {
    if (count > bestCount) {
      best = timezone;
      bestCount = count;
    }
  }
  return best;
}

function averageCoordinates(cities) {
  if (cities.length === 0) return { lat: null, lng: null };
  const total = cities.reduce(
    (accumulator, city) => ({
      lat: accumulator.lat + city.lat,
      lng: accumulator.lng + city.lng,
    }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: Number((total.lat / cities.length).toFixed(5)),
    lng: Number((total.lng / cities.length).toFixed(5)),
  };
}

function writeJson(filePath, value, compact = false) {
  ensureDir(path.dirname(filePath));
  const content = compact ? JSON.stringify(value) : JSON.stringify(value, null, 2);
  fs.writeFileSync(filePath, `${content}\n`, 'utf8');
}

function writeCityFile(filePath, cities, stateTimezone) {
  const sorted = [...cities].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    if (byName !== 0) return byName;
    return b.population - a.population;
  });

  const lines = sorted.map((city) => {
    const entry = {
      id: city.id,
      name: city.name,
    };

    if (city.ascii && city.ascii !== city.name) entry.ascii = city.ascii;
    entry.lat = Number(city.lat.toFixed(5));
    entry.lng = Number(city.lng.toFixed(5));
    entry.population = city.population;
    entry.fcode = city.fcode;

    if (city.municipality) entry.municipality = city.municipality;
    if (city.timezone && city.timezone !== stateTimezone) entry.timezone = city.timezone;

    return JSON.stringify(entry);
  });

  ensureDir(path.dirname(filePath));
  const content = lines.length === 0 ? '[]\n' : `[\n${lines.join(',\n')}\n]\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

async function main() {
  const args = parseArgs();
  const targetCountries = new Set(args.countries);

  ensureDir(CACHE);
  ensureDir(DATA);

  const countryInfoPath = await ensureDownload(
    'https://download.geonames.org/export/dump/countryInfo.txt',
    'countryInfo.txt'
  );
  const admin1Path = await ensureDownload(
    'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
    'admin1CodesASCII.txt'
  );
  const admin2Path = await ensureDownload(
    'https://download.geonames.org/export/dump/admin2Codes.txt',
    'admin2Codes.txt'
  );
  const spanishNamesPath = await ensureDownload(
    'https://raw.githubusercontent.com/umpirsky/country-list/master/data/es/country.json',
    'es_countries.json'
  );
  const allCountriesZip = await ensureDownload(
    'https://download.geonames.org/export/dump/allCountries.zip',
    'allCountries.zip'
  );
  const allCountriesPath = extractZip(allCountriesZip, path.join(CACHE, 'all'));

  const spanishNames = JSON.parse(fs.readFileSync(spanishNamesPath, 'utf8'));
  const stateMap = JSON.parse(fs.readFileSync(STATE_MAP_PATH, 'utf8'));
  const admin1 = parseAdmin1(admin1Path);
  const admin2 = parseAdmin2(admin2Path);

  const { cities, admin1Geo, countryGeo } = await parseAllCountries(
    allCountriesPath,
    targetCountries
  );

  // Correcciones puntuales de localidades (asignación de provincia,
  // nombres, coordenadas o exclusiones). Ver scripts/data/city-overrides.json.
  const cityOverrides = fs.existsSync(CITY_OVERRIDES_PATH)
    ? JSON.parse(fs.readFileSync(CITY_OVERRIDES_PATH, 'utf8'))
    : {};
  let appliedOverrides = 0;

  for (const city of cities) {
    const override = cityOverrides[String(city.id)];
    if (!override) continue;

    appliedOverrides += 1;
    if (override.exclude) {
      city.excluded = true;
      continue;
    }
    if (override.admin1 !== undefined) city.admin1Code = override.admin1;
    if (override.admin2 !== undefined) city.admin2Code = override.admin2;
    if (override.name) city.name = override.name;
    if (override.lat !== undefined) city.lat = Number(override.lat);
    if (override.lng !== undefined) city.lng = Number(override.lng);
  }

  const selectedCities = cities.filter((city) => !city.excluded);
  if (appliedOverrides > 0) {
    console.log(`Correcciones de localidades aplicadas: ${appliedOverrides}`);
  }

  // Países
  const countries = parseCountryInfo(countryInfoPath, spanishNames, countryGeo);
  writeJson(path.join(DATA, 'countries.json'), countries);

  // Agrupar ciudades por país + admin1
  const groups = new Map();
  for (const city of selectedCities) {
    const key = `${city.countryCode}.${city.admin1Code}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(city);
  }

  for (const countryCode of targetCountries) {
    const states = stateMap[countryCode];
    if (!states) {
      console.warn(`Sin mapa de estados para ${countryCode}; se omite.`);
      continue;
    }

    // Limpiar archivos previos del país para evitar estados obsoletos.
    fs.rmSync(path.join(DATA, 'cities', countryCode), { recursive: true, force: true });
    fs.rmSync(path.join(DATA, 'states', `${countryCode}.json`), { force: true });

    const stateEntries = states.map((state) => ({ ...state }));
    const knownAdmin1 = new Set(stateEntries.map((state) => state.admin1));

    // Ciudades sin admin1: asignarlas al estado mas cercano por coordenadas.
    const orphans = groups.get(`${countryCode}.`) || [];
    if (orphans.length > 0) {
      const centroids = stateEntries
        .map((state) => {
          const geo = admin1Geo.get(state.id);
          if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
            return { state, lat: geo.lat, lng: geo.lng };
          }
          const stateCities = groups.get(`${countryCode}.${state.admin1}`) || [];
          const average = averageCoordinates(stateCities);
          return Number.isFinite(average.lat)
            ? { state, lat: average.lat, lng: average.lng }
            : null;
        })
        .filter(Boolean);

      for (const city of orphans) {
        let nearest = null;
        let nearestDistance = Infinity;
        for (const centroid of centroids) {
          const distance = haversine(city, centroid);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = centroid.state;
          }
        }

        if (nearest) {
          city.admin1Code = nearest.admin1;
          const key = `${countryCode}.${nearest.admin1}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(city);
        }
      }
      groups.delete(`${countryCode}.`);
    }

    // Estados presentes en GeoNames pero ausentes del mapa: agregarlos.
    for (const [key, group] of groups.entries()) {
      if (!key.startsWith(`${countryCode}.`)) continue;
      const admin1Code = key.slice(countryCode.length + 1);
      if (!admin1Code || knownAdmin1.has(admin1Code)) continue;

      const geoInfo = admin1.get(key);
      const average = averageCoordinates(group);
      const fallbackState = {
        admin1: admin1Code,
        code: admin1Code,
        iso: null,
        name: geoInfo?.name || admin1Code,
        type: 'división administrativa',
        id: geoInfo?.geonameid || null,
      };
      stateEntries.push(fallbackState);
      knownAdmin1.add(admin1Code);
      console.warn(
        `Estado no mapeado ${key} (${fallbackState.name}); se agregó automáticamente.`
      );
      if (!Number.isFinite(average.lat)) {
        console.warn(`Sin coordenadas para ${key}.`);
      }
    }

    const outputStates = [];

    for (const state of stateEntries) {
      const key = `${countryCode}.${state.admin1}`;
      const group = groups.get(key) || [];
      const geo = state.id ? admin1Geo.get(state.id) : null;
      const average = averageCoordinates(group);
      const timezone = dominantTimezone(group, geo?.timezone || null);

      for (const city of group) {
        if (city.admin2Code) {
          city.municipality = admin2.get(`${countryCode}.${state.admin1}.${city.admin2Code}`) || null;
        }
      }

      const lat = Number.isFinite(geo?.lat) ? Number(geo.lat.toFixed(5)) : average.lat;
      const lng = Number.isFinite(geo?.lng) ? Number(geo.lng.toFixed(5)) : average.lng;

      outputStates.push({
        code: state.code,
        iso: state.iso,
        name: (state.name || '').trim(),
        type: (state.type || '').trim(),
        admin1: state.admin1,
        id: state.id,
        lat,
        lng,
        timezone,
        population: geo?.population || 0,
        cities_count: group.length,
      });

      writeCityFile(
        path.join(DATA, 'cities', countryCode, `${state.code}.json`),
        group,
        timezone
      );
    }

    outputStates.sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
    writeJson(path.join(DATA, 'states', `${countryCode}.json`), outputStates);
  }

  // Recalcular la cobertura leyendo todos los archivos de estados, no solo
  // los generados en esta ejecución. Así `--countries=AR` no borra del
  // índice la cobertura de los demás países.
  const coverage = [];
  let totalStates = 0;
  let totalCities = 0;
  const statesDir = path.join(DATA, 'states');

  if (fs.existsSync(statesDir)) {
    const stateFiles = fs
      .readdirSync(statesDir)
      .filter((file) => file.endsWith('.json'))
      .sort();

    for (const stateFile of stateFiles) {
      const countryCode = path.basename(stateFile, '.json');
      const states = JSON.parse(fs.readFileSync(path.join(statesDir, stateFile), 'utf8'));
      const cities = states.reduce(
        (sum, state) => sum + (Number(state.cities_count) || 0),
        0
      );

      totalStates += states.length;
      totalCities += cities;
      coverage.push({
        code: countryCode,
        name: countries.find((country) => country.code === countryCode)?.name_es || countryCode,
        states: states.length,
        cities,
      });
    }
  }

  coverage.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  const index = {
    version: '2.0.0',
    generated_at: new Date().toISOString(),
    sources: SOURCES,
    totals: {
      countries: countries.length,
      countries_with_states: coverage.length,
      states: totalStates,
      cities: totalCities,
    },
    countries: coverage,
  };
  writeJson(path.join(DATA, 'index.json'), index);

  console.log('');
  console.log('Resumen:');
  console.log(`  Países: ${countries.length}`);
  console.log(`  Países con estados/ciudades: ${coverage.length}`);
  console.log(`  Estados/provincias: ${totalStates}`);
  console.log(`  Ciudades/localidades: ${totalCities.toLocaleString('es')}`);
  console.log(`  Datos escritos en ${path.relative(ROOT, DATA)}/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
