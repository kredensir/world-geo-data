#!/usr/bin/env node
/**
 * Valida la integridad de los archivos generados en data/.
 *
 * Uso:
 *   node scripts/validate.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

const errors = [];
const warnings = [];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`JSON inválido: ${path.relative(ROOT, filePath)} (${error.message})`);
    return null;
  }
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function main() {
  const countriesPath = path.join(DATA, 'countries.json');
  const countries = readJson(countriesPath);
  if (!Array.isArray(countries)) {
    console.error('No se pudo leer data/countries.json');
    process.exit(1);
  }

  const countryCodes = new Set();
  for (const country of countries) {
    assert(/^[A-Z]{2}$/.test(country.code), `País con código inválido: ${country.code}`);
    assert(!countryCodes.has(country.code), `País duplicado: ${country.code}`);
    assert(country.name && country.name_es, `País sin nombre: ${country.code}`);
    assert(Number.isFinite(country.lat) && Number.isFinite(country.lng), `País sin coordenadas: ${country.code}`);
    countryCodes.add(country.code);
  }

  const statesDir = path.join(DATA, 'states');
  const citiesDir = path.join(DATA, 'cities');
  const stateFiles = fs.existsSync(statesDir)
    ? fs.readdirSync(statesDir).filter((file) => file.endsWith('.json'))
    : [];

  let totalStates = 0;
  let totalCities = 0;
  const coverage = [];

  for (const stateFile of stateFiles) {
    const countryCode = path.basename(stateFile, '.json');
    const states = readJson(path.join(statesDir, stateFile));
    if (!Array.isArray(states)) continue;

    assert(countryCodes.has(countryCode), `states/${stateFile}: país inexistente`);
    const stateCodes = new Set();

    for (const state of states) {
      totalStates += 1;
      assert(state.code, `Estado sin codigo en ${countryCode}`);
      assert(!stateCodes.has(state.code), `Estado duplicado ${countryCode}-${state.code}`);
      assert(state.name, `Estado sin nombre ${countryCode}-${state.code}`);
      assert(state.iso === null || state.iso.startsWith(`${countryCode}-`), `ISO inválido ${countryCode}-${state.code}: ${state.iso}`);
      assert(Number.isFinite(state.lat) && Number.isFinite(state.lng), `Estado sin coordenadas ${countryCode}-${state.code}`);
      assert(Number.isInteger(state.cities_count) && state.cities_count >= 0, `cities_count inválido ${countryCode}-${state.code}`);
      stateCodes.add(state.code);

      const cityPath = path.join(citiesDir, countryCode, `${state.code}.json`);
      if (!fs.existsSync(cityPath)) {
        errors.push(`Falta archivo de ciudades: ${path.relative(ROOT, cityPath)}`);
        continue;
      }

      const cities = readJson(cityPath);
      if (!Array.isArray(cities)) continue;

      assert(cities.length === state.cities_count, `cities_count no coincide en ${countryCode}-${state.code}: ${state.cities_count} vs ${cities.length}`);
      totalCities += cities.length;

      const cityIds = new Set();
      for (const city of cities) {
        assert(Number.isInteger(city.id) && city.id > 0, `Ciudad sin id valido en ${countryCode}-${state.code}`);
        assert(city.name && city.name.trim().length > 0, `Ciudad sin nombre en ${countryCode}-${state.code}`);
        assert(!cityIds.has(city.id), `Ciudad duplicada ${city.id} en ${countryCode}-${state.code}`);
        assert(Number.isFinite(city.lat) && Number.isFinite(city.lng), `Ciudad sin coordenadas ${city.id} en ${countryCode}-${state.code}`);
        assert(Number.isInteger(city.population) && city.population >= 0, `Población inválida ${city.id} en ${countryCode}-${state.code}`);
        assert(typeof city.fcode === 'string' && city.fcode.startsWith('PPL'), `fcode inválido ${city.id} en ${countryCode}-${state.code}`);
        cityIds.add(city.id);
      }
    }

    // Archivos de ciudades que no corresponden a un estado declarado.
    const countryCitiesDir = path.join(citiesDir, countryCode);
    if (fs.existsSync(countryCitiesDir)) {
      for (const file of fs.readdirSync(countryCitiesDir).filter((name) => name.endsWith('.json'))) {
        const code = path.basename(file, '.json');
        if (!stateCodes.has(code)) {
          warnings.push(`Archivo de ciudades sin estado: ${countryCode}/${file}`);
        }
      }
    }

    coverage.push({
      code: countryCode,
      states: states.length,
      cities: states.reduce((sum, state) => sum + state.cities_count, 0),
    });
  }

  const indexPath = path.join(DATA, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = readJson(indexPath);
    if (index) {
      assert(index.totals.states === totalStates, `index.totals.states (${index.totals.states}) no coincide con ${totalStates}`);
      assert(index.totals.cities === totalCities, `index.totals.cities (${index.totals.cities}) no coincide con ${totalCities}`);
      assert(index.totals.countries === countries.length, `index.totals.countries (${index.totals.countries}) no coincide con ${countries.length}`);
    }
  }

  console.log(`Países: ${countries.length}`);
  console.log(`Países con estados/ciudades: ${coverage.length}`);
  console.log(`Estados/provincias: ${totalStates}`);
  console.log(`Ciudades/localidades: ${totalCities.toLocaleString('es')}`);

  if (warnings.length > 0) {
    console.log('');
    console.log(`Advertencias (${warnings.length}):`);
    for (const warning of warnings) console.log(`  - ${warning}`);
  }

  if (errors.length > 0) {
    console.log('');
    console.error(`Errores (${errors.length}):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }

  console.log('');
  console.log('Validación OK.');
}

main();
