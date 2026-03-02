const map = L.map('map').setView([49.0, 31.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let leafletMarkers = {};
let currentRequestId = null;

async function loadMarkers() {

    const response = await fetch('/api/requests');
    const result = await response.json();

    const data = result.requests;

    if (!Array.isArray(data)) return;

    const activeIds = data.map(r => r.id);

    Object.keys(leafletMarkers).forEach(id => {
        if (!activeIds.includes(Number(id))) {
            map.removeLayer(leafletMarkers[id]);
            delete leafletMarkers[id];
        }
    });

    data.forEach(req => {

        if (leafletMarkers[req.id]) {

            leafletMarkers[req.id].setPopupContent(`
                <b>${req.title}</b><br>
                Статус: ${req.status}<br>
                <button onclick="openDetails(${req.id})">
                    Відкрити деталі
                </button>
            `);

        } else {

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

    if (currentRequestId) {

        const currentReq = data.find(r => r.id === currentRequestId);

        if (currentReq) {

            document.getElementById("detail-status").innerText = currentReq.status;

            updateSidebarUI(currentReq, result.current_user);
        }
    }
}
setInterval(loadMarkers, 3000);
loadMarkers();

async function openDetails(id) {

    currentRequestId = id;

    const response = await fetch('/api/requests');
    const result = await response.json();

    const currentUser = result.current_user;
    const data = result.requests;

    const req = data.find(r => Number(r.id) === Number(id));
    if (!req) return;

    document.getElementById("detail-title").innerText = req.title;
    document.getElementById("detail-description").innerText = req.description;
    document.getElementById("detail-status").innerText = req.status;

    document.getElementById("sidebar").classList.add("active");

    updateSidebarUI(req, currentUser);
}
async function acceptRequest() {
    await fetch(`/api/requests/${currentRequestId}/accept`, { method: "POST" });
    await loadMarkers();
}

async function cancelRequest() {
    await fetch(`/api/requests/${currentRequestId}/cancel`, { method: "POST" });
    await loadMarkers();
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

function updateSidebarUI(req, currentUser) {

    const acceptBtn = document.getElementById("acceptBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const contactsBtn = document.getElementById("contactsBtn");

    if (
        req.status &&
        req.status.toLowerCase() === "new" &&
        currentUser &&
        currentUser !== req.author_email
    ) {
        acceptBtn.style.display = "block";
    } else {
        acceptBtn.style.display = "none";
    }

    if (
        currentUser &&
        (currentUser === req.author_email ||
         currentUser === req.accepted_by)
    ) {
        cancelBtn.style.display = "block";
    } else {
        cancelBtn.style.display = "none";
    }

    if (
        req.status &&
        req.status.toLowerCase() === "accepted" &&
        currentUser &&
        (currentUser === req.author_email ||
         currentUser === req.accepted_by)
    ) {
        contactsBtn.style.display = "block";
    } else {
        contactsBtn.style.display = "none";
    }
}