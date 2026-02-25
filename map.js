// Клієнтська логіка мапи: завантаження маркерів, деталі запиту, прийняття/скасування та контакти.
const map = L.map('map').setView([49.0, 31.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let leafletMarkers = {};
let currentRequestId = null;

async function loadMarkers() {

    const response = await fetch('/api/requests');
    const data = await response.json();

    const activeIds = data.map(r => r.id);

    Object.keys(leafletMarkers).forEach(id => {
        if (!activeIds.includes(Number(id))) {
            map.removeLayer(leafletMarkers[id]);
            delete leafletMarkers[id];
        }
    });

    data.forEach(req => {

        if (req.status !== "New" && req.status !== "Accepted") {
            return;
        }

        if (!leafletMarkers[req.id]) {

            const marker = L.marker([req.lat, req.lng])
                .addTo(map)
                .bindPopup(`
                    <b>${req.title}</b><br>
                    Статус: ${req.status}<br>
                    <button onclick="openDetails(${req.id})">
                        Відкрити деталі
                    </button>
                `);

            leafletMarkers[req.id] = marker;
        }
    });
}

setInterval(loadMarkers, 3000);
loadMarkers();

async function openDetails(id) {

    currentRequestId = id;

    const response = await fetch('/api/requests');
    const data = await response.json();

    const req = data.find(r => r.id === id);

    document.getElementById("detail-title").innerText = req.title;
    document.getElementById("detail-description").innerText = req.description;
    document.getElementById("detail-status").innerText = req.status;

    document.getElementById("sidebar").classList.add("active");

    if (req.status === "Accepted") {
        document.getElementById("contactsBtn").style.display = "block";
    } else {
        document.getElementById("contactsBtn").style.display = "none";
    }
}

async function acceptRequest() {

    await fetch(`/api/requests/${currentRequestId}/accept`, {
        method: "POST"
    });

    await loadMarkers();
    closeSidebar();
}

async function cancelRequest() {

    await fetch(`/api/requests/${currentRequestId}/cancel`, {
        method: "POST"
    });

    await loadMarkers();
    closeSidebar();
}

async function showContacts() {

    const response = await fetch(`/api/requests/${currentRequestId}/contacts`);
    const data = await response.json();

    alert(`
Автор:
Email: ${data.author.email}
Телефон: ${data.author.phone}

Виконавець:
Email: ${data.helper.email}
Телефон: ${data.helper.phone}
    `);
}

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("active");
}
