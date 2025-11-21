<?php
// 1. TELL THE BROWSER IT'S OKAY
// This header tells your browser: "It is safe to read data from this script."
header("Access-Control-Allow-Origin: *");

// This header says: "The data I am sending back is JSON (text data), not an HTML page."
header("Content-Type: application/json");

// 2. GET THE ICAO CODE
// When you call this file like 'metadata.php?icao=a83b29', 
// $_GET['icao'] grabs that 'a83b29' part.
if (isset($_GET['icao'])) {
    $icao = $_GET['icao'];

    // 3. PREPARE THE OPENSKY URL
    // We stick the hex code onto the end of the OpenSky API URL.
    $target_url = "https://opensky-network.org/api/metadata/aircraft/icao/" . $icao;

    // 4. FETCH THE DATA (The Server-Side Magic)
    // file_get_contents() is a PHP function that goes out to the internet,
    // visits that URL, and grabs everything on the page.
    // Because this happens on the server, CORS doesn't apply.
    $response = file_get_contents($target_url);

    // 5. CHECK FOR ERRORS
    // If OpenSky didn't return anything (or the flight doesn't exist)...
    if ($response === FALSE) {
        // Send a 404 error code
        http_response_code(404);
        // Send a JSON error message
        echo json_encode(["error" => "Could not fetch data"]);
    } else {
        // 6. SEND THE DATA BACK
        // 'echo' prints the data. Your JavaScript 'fetch' will receive this.
        echo $response;
    }
} else {
    // If you forgot to add ?icao=... to the URL
    echo json_encode(["error" => "No ICAO code provided"]);
}
?>