fetch("http://localhost:3000", {
    method: "GET"
}).then(response => response.text())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));