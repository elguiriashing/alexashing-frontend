const axios = require('axios');
const overpassQuery = `
  [out:json][timeout:25];
  area["name"="Fuengirola"]->.searchArea;
  (
    nwr["amenity"~"bar",i](area.searchArea);
  );
  out center 30;
`;
axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(overpassQuery)}`, {
  headers: { 
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'User-Agent': 'ASHING-CRM-App/1.0'
  }
}).then(res => console.log(res.data)).catch(err => {
  console.error(err.response ? err.response.status + ' ' + err.response.data : err.message);
});
