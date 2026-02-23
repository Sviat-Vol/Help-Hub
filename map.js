const map = L.map('map').setView([49.0, 31.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let leafletMarkers = {};
let currentRequestId = null;

// ==============================
// Завантаження запитів
// ==============================

async function loadMarkers() {

    const response = await fetch('/api/requests');
    const data = await response.json();

    data.forEach(req => {

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


// ==============================
// Відкрити sidebar
// ==============================

async function openDetails(id) {

    currentRequestId = id;

    const response = await fetch('/api/requests');
    const data = await response.json();

    const req = data.find(r => r.id === id);

    document.getElementById("detail-title").innerText = req.title;
    document.getElementById("detail-description").innerText = req.description;
    document.getElementById("detail-status").innerText = req.status;

    document.getElementById("sidebar").classList.add("active");

    // Показуємо кнопку контактів якщо прийнятий
    if (req.status === "Accepted") {
        document.getElementById("contactsBtn").style.display = "block";
    } else {
        document.getElementById("contactsBtn").style.display = "none";
    }
}


// ==============================
// Прийняти
// ==============================

async function acceptRequest() {

    await fetch(`/api/requests/${currentRequestId}/accept`, {
        method: "POST"
    });

    loadMarkers();
    closeSidebar();
}


// ==============================
// Скасувати
// ==============================

async function cancelRequest() {

    await fetch(`/api/requests/${currentRequestId}/cancel`, {
        method: "POST"
    });

    loadMarkers();
    closeSidebar();
}


// ==============================
// Контакти
// ==============================

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


// ==============================
// Закриття
// ==============================

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("active");
}