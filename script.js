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

const base_url = 'https://opensky-network.org/api';
const metadata_api = 'https://api.meiraba.me/flight_metadata?icao=' // /icao24

const aircraftLayer = L.layerGroup().addTo(map);
let isPopupOpen = false;
let all_flights = []
loadAllFlights()
function loadAllFlights() {
    fetch(base_url + '/states/all').then(async (r) => {
        let data = await r.json();
        all_flights = data.states
    })
}
function fetchAndLoadOpenSkyData() {
    let bounds = getBounds();
    if (isPopupOpen) {
        console.log("Refresh locked: Popup is active.");
        return;
    }
    fetch(base_url + `/states/all?lamin=${bounds.lamin}&lomin=${bounds.lomin}&lamax=${bounds.lamax}&lomax=${bounds.lomax}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
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
let source = ["ADS-B", "ASTERIX", "MLAT", "FLARM"]

function processOpenSkyStates(statesArray) {
    aircraftLayer.clearLayers();
    statesArray.forEach(aircraftState => {
        let data = {
            icao24: aircraftState[0],
            callsign: aircraftState[1],
            origin_country: aircraftState[2],
            latitude: aircraftState[6],
            longitude: aircraftState[5],
            altitude: aircraftState[7],
            velocity: aircraftState[9],
            heading: aircraftState[10],
            vertical_rate: aircraftState[11],
            position_source: source[aircraftState[16]]
        }
        if (data.latitude !== null && data.longitude !== null) {

            // const marker = L.marker([latitude, longitude], {
            //     // Optional: Use a custom plane icon instead of default pin
            //     icon: myIcon
            // });
            const rotatedIcon = L.divIcon({
                className: 'plane-icon',
                html: `<div style="transform: rotate(${data.heading}deg)"><img src="https://files.catbox.moe/2n9ih5.svg" style="width: 30px; height: 30px;"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15] // Anchors the icon center to the coordinates
            });

            const marker = L.marker([data.latitude, data.longitude], {
                icon: rotatedIcon,
                data: data
            });
            // Build the popup content
            const popupContent = getPopupHTMLTemplate(data);
            // `
            //     <strong>Callsign:</strong> ${data.callsign ? data.callsign.trim() : 'N/A'}<br>
            //     <strong>ICAO24:</strong> ${data.icao24}<br>
            //     <strong>Lat/Lng:</strong> ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}
            // `;

            marker.bindPopup(popupContent);
            marker.on('popupopen', onPopupOpen);
            marker.on('popupclose', onPopupClose);
            aircraftLayer.addLayer(marker);
        }
    });
}


fetchAndLoadOpenSkyData();
map.on('moveend', fetchAndLoadOpenSkyData);
setInterval(fetchAndLoadOpenSkyData, 10000);
setInterval(loadAllFlights, 120000);
function getBounds() {
    let bounds = map.getBounds()
    return {
        lamin: bounds.getSouth(),
        lomin: bounds.getWest(),
        lamax: bounds.getNorth(),
        lomax: bounds.getEast()
    };
}
async function onPopupOpen(e) {
    isPopupOpen = true;
    const marker = e.target
    const data = marker.options.data;

    let metadata = await fetch(`https://api.meiraba.me/flight_metadata?icao=${data.icao24}`).then(async (r) => { return await r.json() });
    console.log('metadata api data:', metadata)
    data.registration = metadata.registration || 'N/A'
    data.typecode = metadata.typecode || 'N/A'
    data.class = metadata.class || 'N/A'
    data.manufacturer = metadata.manufacturer || 'N/A'
    // let img_data = await fetch(img_api + `/${data.icao24}?reg=${data.registration}&icaoType=${data.class}`).then(async (r) => { return await r.json() });

    data.img = metadata.img || 'https://www.shutterstock.com/shutterstock/videos/1075581560/thumb/10.jpg?ip=x480';
    data.name = metadata.name || 'N/A'
    console.log('popup data:', data)
    marker.setPopupContent(getPopupHTMLTemplate(data));
}
function onLocationFound(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const latlng = L.latLng(lat, lng);
    L.marker(latlng).addTo(map)
        .bindPopup("You are here.")
    map.setView(latlng, 10);
}


function getPopupHTMLTemplate(data) {
    return `
        <div class="aircraft-info-panel">
    
    <div class="image-container" id="img-${data.icao24}">
        ${data.img ? `<img src="${data.img}" alt="Aircraft Image" />` : '<span style="color:#888;">Image Loading...</span>'}
    </div>

    <div class="data-row">
        
        <div class="info-column-info">
            <div>ICAO: <span id="popup-name">${data.icao24 || 'N/A'}</span></div>
            <div>Callsign: ${data.callsign || 'N/A'}</div>
            <div>Reg: <span id="popup-reg">${data.registration || 'Loading...'}</span></div>
            <div>Country: <span id="popup-country">${data.origin_country || 'N/A'}</span></div>
            <div>Type: <span id="popup-type">${data.typecode || 'Loading...'}</span></div>
            <div>Name: <span id="popup-type-name">${data.name || 'Loading...'}</span></div>
            <div>Class: <span id="popup-class">${data.class || 'Loading...'}</span></div>
            <div>Manufacturer: <span id="popup-manufacturer">${data.manufacturer || 'Loading...'}</span></div>
        </div>
        
        <div class="info-column-stats">
            <div>Speed: <span id="popup-speed">${data.velocity || 'N/A'}</span></div>
            <div>Altitude: <span id="popup-altitude">${data.altitude || 'N/A'}</span></div>
            <div>Pos: <span id="popup-pos">${data.longitude ? `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}` : 'N/A'}</span></div>
            <div>Vertical Rate: <span id="popup-vr">${data.vertical_rate || 'N/A'}</span></div>
            <div>Track: <span id="popup-track">${data.heading || 'N/A'}</span></div>
            <div>Source: <span id="popup-source">${data.position_source || 'N/A'}</span></div>
        </div>
    </div>
</div>
    `;
}
function onPopupClose(e) {
    isPopupOpen = false;
}


// 1. Get References
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('searchResults');

function handleSearch(text) {
    let query = text.toUpperCase().trim();
    let list = all_flights.length ? all_flights : [];
    let found = list.filter(f => f[1] && f[1].includes(query));
    renderResults(found.slice(0, 10).map(f => {
        return {
            icao24: f[0],
            callsign: f[1],
            origin_country: f[2]
        }
    }));
}


// renderResults(['one', 'two']);
function renderResults(matches) {
    resultsContainer.innerHTML = ''; // Clear old results

    if (matches.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    matches.forEach(plane => {
        const div = document.createElement('div');
        div.className = 'result-item';

        // Layout: Callsign on left, Hex on right
        div.innerHTML = `
            <strong>${plane.callsign}</strong>
            <span>${plane.icao24}</span>
        `;

        // 5. Click Event: Fly to Plane
        div.onclick = async () => {
            // Zoom to the marker
            isPopupOpen = true
            let flight = await fetch(base_url + `/states/all?icao24=${plane.icao24}`).then(async (r) => { return await r.json() })
            aircraftLayer.clearLayers();
            flight = flight.states.map(f =>{
                return {
                icao24: f[0],
                callsign: f[1],
                origin_country: f[2],
                latitude: f[6],
                longitude: f[5],
                altitude: f[7],
                velocity: f[9],
                heading: f[10],
                vertical_rate: f[11],
                position_source: source[f[16]]
            }
            })[0]
            console.log(JSON.stringify(flight))
            map.flyTo([flight.latitude, flight.longitude], 10);

            const rotatedIcon = L.divIcon({
                className: 'plane-icon',
                html: `<div style="transform: rotate(${flight.heading}deg)"><img src="https://files.catbox.moe/2n9ih5.svg" style="width: 30px; height: 30px;"></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15] // Anchors the icon center to the coordinates
            });

            const marker = L.marker([flight.latitude, flight.longitude], {
                icon: rotatedIcon,
                data: flight
            });
            // Build the popup content
            const popupContent = getPopupHTMLTemplate(flight);
            // `
            //     <strong>Callsign:</strong> ${data.callsign ? data.callsign.trim() : 'N/A'}<br>
            //     <strong>ICAO24:</strong> ${data.icao24}<br>
            //     <strong>Lat/Lng:</strong> ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}
            // `;
            marker.bindPopup(popupContent);
            marker.on('popupopen', onPopupOpen);
            marker.on('popupclose', onPopupClose);
            isPopupOpen = true
            aircraftLayer.addLayer(marker);
            marker.openPopup();
            searchInput.value = '';
            resultsContainer.style.display = 'none';
        };

        resultsContainer.appendChild(div);
    });

    resultsContainer.style.display = 'block'; // Show the list
}

// Helper to clear search manually
function clearSearch() {
    searchInput.value = '';
    resultsContainer.style.display = 'none';
}
