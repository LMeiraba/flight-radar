var map = L.map('map').setView([12.940965, 77.566578], 10);//college

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onLocationFound, null, {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
});
} else {
    alert("Geolocation is not supported by this browser.");
}
function onLocationFound(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const latlng = L.latLng(lat, lng);
    L.marker(latlng).addTo(map)
        .bindPopup("You are here.")
    map.setView(latlng, 10); 
}

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
L.control.scale().addTo(map);

var myIcon = L.icon({
    iconUrl: 'https://files.catbox.moe/6ns049.png',
    iconSize: [30, 30],
    iconAnchor: [10, 30],
    popupAnchor: [5, -30]
});

// L.marker([12.940965, 77.566578], { icon: myIcon }).addTo(map)
//     .bindPopup('starting point.')
//     .openPopup();
const base_url = 'https://opensky-network.org/api';

const aircraftLayer = L.layerGroup().addTo(map);

function fetchAndLoadOpenSkyData() {
    aircraftLayer.clearLayers();
    let bounds = getBounds();
    // console.log(map.getBounds().getSouth(), map.getBounds().getNorth(), map.getBounds().getWest(), map.getBounds().getEast());
    fetch(base_url + `/states/all?lamin=${bounds.lamin}&lomin=${bounds.lomin}&lamax=${bounds.lamax}&lomax=${bounds.lomax}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if the response contains the 'states' array
            if (data && data.states) {
                processOpenSkyStates(data.states);
                console.log(`Loaded ${data.states.length} aircraft states.`);
            } else {
                console.warn("OpenSky response did not contain the expected 'states' array.");
            }
        })
        .catch(error => {
            console.error("Could not fetch OpenSky data:", error);
        });
}

function processOpenSkyStates(statesArray) {
    statesArray.forEach(aircraftState => {
        const longitude = aircraftState[5]; // Index 5
        const latitude = aircraftState[6];  // Index 6
        const icao24 = aircraftState[0];    // ICAO 24-bit address (unique ID)
        const callsign = aircraftState[1];  // Flight number (e.g., 'AAL123')
        const heading = aircraftState[10];
        if (latitude !== null && longitude !== null) {
            
            // const marker = L.marker([latitude, longitude], {
            //     // Optional: Use a custom plane icon instead of default pin
            //     icon: myIcon
            // });
            const rotatedIcon = L.divIcon({
                className: 'plane-icon',
                html: `<div style="transform: rotate(${heading}deg)"><img src="https://files.catbox.moe/6ns049.png" style="width: 30px; height: 30px;"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15] // Anchors the icon center to the coordinates
            });
            
            const marker = L.marker([latitude, longitude], {
                icon: rotatedIcon
            });
            // Build the popup content
            const popupContent = `
                <strong>Callsign:</strong> ${callsign ? callsign.trim() : 'N/A'}<br>
                <strong>ICAO24:</strong> ${icao24}<br>
                <strong>Lat/Lng:</strong> ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
            `;

            marker.bindPopup(popupContent);
            
            // Add the new marker to the LayerGroup
            aircraftLayer.addLayer(marker);
        }
    });
}


fetchAndLoadOpenSkyData(); 
// const debouncedFetch = debounce(fetchAndLoadOpenSkyData, 750);
map.on('moveend', fetchAndLoadOpenSkyData);
// setInterval(fetchAndLoadOpenSkyData, 30000); 

function getBounds(){
    let bounds = map.getBounds()
    return {
        lamin: bounds.getSouth(), 
        lomin: bounds.getWest(),
        lamax: bounds.getNorth(),
        lomax: bounds.getEast()
    };
}
