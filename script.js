var map = L.map('map').setView([12.940965, 77.566578], 10);//college

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
L.control.scale().addTo(map);
// L.control.layers(baseMaps, overlays).addTo(map);
var myIcon = L.icon({
    iconUrl: 'https://files.catbox.moe/6ns049.png',
    iconSize: [30, 30],
    iconAnchor: [10, 30],
    popupAnchor: [5, -30]
});

// L.marker([12.940965, 77.566578], { icon: myIcon }).addTo(map)
//     .bindPopup('starting point.')
//     .openPopup();
// Replace with the actual API endpoint for all states
const OPEN_SKY_API_ENDPOINT = 'https://opensky-network.org/api/states/all';

// A LayerGroup to hold all aircraft markers, making it easy to clear/update
const aircraftLayer = L.layerGroup().addTo(map);

function fetchAndLoadOpenSkyData() {
    // 1. Clear previous markers before fetching new data
    aircraftLayer.clearLayers();

    fetch(OPEN_SKY_API_ENDPOINT)
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
        
        // **CRITICAL CHECK**: Only proceed if coordinates are available
        // OpenSky includes non-localized aircraft, which have null lat/lng.
        if (latitude !== null && longitude !== null) {
            
            const marker = L.marker([latitude, longitude], {
                // Optional: Use a custom plane icon instead of default pin
                icon: myIcon
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

// 3. Initial Load and Refresh (Set up a timer for real-time updates)
fetchAndLoadOpenSkyData(); // Load data immediately

// Refresh the data every 30 seconds (OpenSky data updates every 5-10s)
// Use a higher interval to be polite and avoid hitting rate limits.
// setInterval(fetchAndLoadOpenSkyData, 30000); 

// Note: You must initialize your map object (var map = L.map('map')...) 
// and tile layers before this script runs.


// function loadDataPoints(dataArray) {
//     // Create a LayerGroup to hold all the markers (for easy management)
//     const pointsLayer = L.layerGroup();

//     dataArray.forEach(point => {
//         // Ensure coordinates are present
//         if (point.lat && point.lng) {
//             // Create a marker using the latitude and longitude
//             const marker = L.marker([point.lat, point.lng]);

//             // If the data includes a title or name, bind a popup
//             if (point.title) {
//                 marker.bindPopup(point.title);
//             }

//             // Add the marker to the LayerGroup
//             pointsLayer.addLayer(marker);
//         }
//     });

//     // Add the entire LayerGroup to the map in one operation
//     pointsLayer.addTo(map);

//     // Optional: Zoom the map to fit all the loaded points
//     if (pointsLayer.getLayers().length > 0) {
//         map.fitBounds(pointsLayer.getBounds());
//     }
// }