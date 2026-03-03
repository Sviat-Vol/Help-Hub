document.addEventListener("DOMContentLoaded", () => {

    const geoBtn = document.getElementById("geoBtn");
    const latInput = document.getElementById("lat");
    const lngInput = document.getElementById("lng");
    const createBtn = document.getElementById("createBtn");

    geoBtn.addEventListener("click", () => {

        navigator.geolocation.getCurrentPosition((position) => {
            latInput.value = position.coords.latitude;
            lngInput.value = position.coords.longitude;
            geoBtn.textContent = "✅ Локацію визначено";
        });
    });

    createBtn.addEventListener("click", async (e) => {

        e.preventDefault();

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const lat = latInput.value;
        const lng = lngInput.value;

        if (!title || !description || !lat || !lng) {
            alert("Заповніть всі поля");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("lat", lat);
        formData.append("lng", lng);

        const response = await fetch("/api/requests", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            alert("Запит створено!");
            window.location.href = "/map";
        } else {
            alert("Помилка створення");
        }
    });
});