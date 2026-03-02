const map = L.map('map').setView([49.0, 31.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let leafletMarkers = {};
let currentRequestId = null;
let currentUser = null;
let isAdmin = false;
let requestsCache = [];
let selectedUserForDeletion = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadMarkers() {

    const response = await fetch('/api/requests');
    const result = await response.json();

    const data = result.requests;
    currentUser = result.current_user;
    isAdmin = Boolean(result.is_admin);
    requestsCache = Array.isArray(data) ? data : [];

    const openComplaintsBtn = document.getElementById("openComplaintsBtn");
    const closeComplaintsBtn = document.getElementById("closeComplaintsBtn");
    const openUserAdminBtn = document.getElementById("openUserAdminBtn");
    if (openComplaintsBtn) {
        openComplaintsBtn.style.display = isAdmin ? "block" : "none";
    }
    if (closeComplaintsBtn) {
        closeComplaintsBtn.style.display = "none";
    }
    if (openUserAdminBtn) {
        openUserAdminBtn.style.display = isAdmin ? "block" : "none";
    }

    if (isAdmin) {
        await loadComplaints();
    } else {
        closeComplaintsSidebar();
        closeUserAdminPanel();
    }

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
                <b>${escapeHtml(req.title)}</b><br>
                Статус: ${escapeHtml(req.status)}<br>
                <button onclick="openDetails(${req.id})">
                    Відкрити деталі
                </button>
            `);

        } else {

            const marker = L.marker([req.lat, req.lng])
                .addTo(map)
                .bindPopup(`
                    <b>${escapeHtml(req.title)}</b><br>
                    Статус: ${escapeHtml(req.status)}<br>
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

            updateSidebarUI(currentReq, currentUser, isAdmin);
        }
    }
}
setInterval(loadMarkers, 3000);
loadMarkers();

async function openDetails(id) {

    currentRequestId = id;

    const response = await fetch('/api/requests');
    const result = await response.json();

    const data = result.requests;
    currentUser = result.current_user;
    isAdmin = Boolean(result.is_admin);

    const req = data.find(r => Number(r.id) === Number(id));
    if (!req) return;

    document.getElementById("detail-title").innerText = req.title;
    document.getElementById("detail-description").innerText = req.description;
    document.getElementById("detail-status").innerText = req.status;

    document.getElementById("sidebar").classList.add("active");

    updateSidebarUI(req, currentUser, isAdmin);
}
async function acceptRequest() {
    await fetch(`/api/requests/${currentRequestId}/accept`, { method: "POST" });
    await loadMarkers();
}

async function cancelRequest() {
    await fetch(`/api/requests/${currentRequestId}/cancel`, { method: "POST" });
    await loadMarkers();
}

async function deleteRequestByAdmin() {
    const reason = prompt("Вкажіть причину видалення запиту:");
    if (!reason || !reason.trim()) return;

    const formData = new URLSearchParams();
    formData.set("reason", reason.trim());

    const response = await fetch(`/api/requests/${currentRequestId}/delete`, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: formData
    });
    const result = await response.json();
    if (result.error) {
        alert(result.error);
        return;
    }

    closeSidebar();
    await loadMarkers();
    alert("Запит видалено.");
}

async function reportRequest() {
    const complaintText = prompt("Введіть текст скарги:");
    if (!complaintText || !complaintText.trim()) return;

    const formData = new URLSearchParams();
    formData.set("complaint_text", complaintText.trim());
    const response = await fetch(`/api/requests/${currentRequestId}/report`, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: formData
    });
    const result = await response.json();
    if (result.error) {
        alert(result.error);
        return;
    }
    alert("Скаргу надіслано.");
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

function openComplaintsSidebar() {
    const sidebar = document.getElementById("complaintsSidebar");
    if (sidebar) sidebar.classList.add("active");
    const openBtn = document.getElementById("openComplaintsBtn");
    const closeBtn = document.getElementById("closeComplaintsBtn");
    if (openBtn) openBtn.style.display = "none";
    if (closeBtn && isAdmin) closeBtn.style.display = "block";
}

function closeComplaintsSidebar() {
    const sidebar = document.getElementById("complaintsSidebar");
    if (sidebar) sidebar.classList.remove("active");
    const openBtn = document.getElementById("openComplaintsBtn");
    const closeBtn = document.getElementById("closeComplaintsBtn");
    if (openBtn && isAdmin) openBtn.style.display = "block";
    if (closeBtn) closeBtn.style.display = "none";
}

function toggleUserAdminPanel() {
    const panel = document.getElementById("userAdminPanel");
    if (!panel) return;
    panel.classList.toggle("active");
}

function closeUserAdminPanel() {
    const panel = document.getElementById("userAdminPanel");
    if (!panel) return;
    panel.classList.remove("active");
}

async function searchUserForDelete() {
    const input = document.getElementById("userSearchEmail");
    const resultBox = document.getElementById("userSearchResult");
    if (!input || !resultBox) return;

    const email = input.value.trim().toLowerCase();
    selectedUserForDeletion = null;
    if (!email) {
        resultBox.textContent = "Введіть пошту користувача.";
        return;
    }

    const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(email)}`);
    const result = await response.json();
    if (result.error) {
        resultBox.textContent = result.error;
        return;
    }
    if (!result.found) {
        resultBox.textContent = "Користувача не знайдено.";
        return;
    }

    selectedUserForDeletion = result.user.email;
    resultBox.textContent = `Знайдено: ${result.user.surname} ${result.user.name} (${result.user.email})`;
}

async function deleteUserByAdmin() {
    const reasonSelect = document.getElementById("userDeleteReason");
    const resultBox = document.getElementById("userSearchResult");
    if (!resultBox || !reasonSelect) return;
    if (!selectedUserForDeletion) {
        resultBox.textContent = "Спочатку знайдіть користувача.";
        return;
    }
    const reason = reasonSelect.value;
    if (!reason) {
        resultBox.textContent = "Оберіть причину видалення.";
        return;
    }
    if (!confirm(`Видалити користувача ${selectedUserForDeletion}?`)) {
        return;
    }

    const formData = new URLSearchParams();
    formData.set("email", selectedUserForDeletion);
    formData.set("reason", reason);
    const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: formData,
    });
    const result = await response.json();
    if (result.error) {
        resultBox.textContent = result.error;
        return;
    }

    resultBox.textContent = `Користувача ${selectedUserForDeletion} видалено.`;
    selectedUserForDeletion = null;
    document.getElementById("userSearchEmail").value = "";
    reasonSelect.value = "";
    await loadMarkers();
    await loadComplaints();
}

async function loadComplaints() {
    const response = await fetch("/api/complaints");
    const result = await response.json();
    if (result.error) return;

    const container = document.getElementById("complaintsList");
    if (!container) return;

    if (!Array.isArray(result.complaints) || result.complaints.length === 0) {
        container.innerHTML = "<p>Скарг поки немає.</p>";
        return;
    }

    container.innerHTML = result.complaints
        .map((complaint) => `
            <div class="complaint-card">
                <p><b>Надіслав:</b> ${escapeHtml(complaint.sender_email)}</p>
                <p><b>Скарга:</b> ${escapeHtml(complaint.complaint_text)}</p>
                <p><b>Кому:</b> ${escapeHtml(complaint.target_email)}</p>
                <button class="complaint-delete-btn" onclick="deleteComplaint(${complaint.id})">Видалити скаргу</button>
            </div>
        `)
        .join("");
}

async function deleteComplaint(complaintId) {
    const response = await fetch(`/api/complaints/${complaintId}/delete`, { method: "POST" });
    const result = await response.json();
    if (result.error) {
        alert(result.error);
        return;
    }
    await loadComplaints();
}

function updateSidebarUI(req, currentUser, isAdmin) {

    const acceptBtn = document.getElementById("acceptBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const contactsBtn = document.getElementById("contactsBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const reportBtn = document.getElementById("reportBtn");

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

    deleteBtn.style.display = isAdmin ? "block" : "none";
    reportBtn.style.display = (currentUser && currentUser !== req.author_email) ? "block" : "none";
}
