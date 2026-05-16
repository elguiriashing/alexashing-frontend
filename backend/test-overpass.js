const axios = require('axios');
const type = 'bar';
const location = 'Fuengirola';
const formattedLocation = location.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
const typeEscaped = type.trim().toLowerCase();
const overpassQuery = `[out:json][timeout:30];area["name"="${formattedLocation}"]->.a;(node["amenity"~"${typeEscaped}",i](area.a);way["amenity"~"${typeEscaped}",i](area.a););out center 50;`;

console.log('Query:', overpassQuery);
const start = Date.now();

axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(overpassQuery)}`, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'User-Agent': 'ASHING-CRM/1.0' },
  timeout: 55000
}).then(res => {
  const elapsed = Date.now() - start;
  console.log(`Done in ${elapsed}ms. Elements: ${res.data.elements.length}`);
  if (res.data.elements.length > 0) {
    const sample = res.data.elements[0];
    console.log('Sample:', JSON.stringify(sample.tags, null, 2));
  }
}).catch(err => {
  console.error('ERROR:', err.message);
});
