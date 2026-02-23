// document.addEventListener("DOMContentLoaded", () => {

//     const geoBtn = document.getElementById("geoBtn");
//     const latInput = document.getElementById("lat");
//     const lngInput = document.getElementById("lng");
//     const successMessage = document.getElementById("successMessage");
//     const createBtn = document.getElementById("createBtn");

//     /* =========================
//        Показ повідомлення після reload
//     ========================== */

//     if (sessionStorage.getItem("requestSuccess") === "true") {
//         successMessage.innerHTML = "✅ Запит успішно створено!";
//         successMessage.style.color = "green";
//         sessionStorage.removeItem("requestSuccess");
//     }

//     /* =========================
//        GEOLOCATION
//     ========================== */

//     geoBtn.addEventListener("click", () => {

//         if (!navigator.geolocation) {
//             alert("Ваш браузер не підтримує геолокацію");
//             return;
//         }

//         geoBtn.textContent = "Отримуємо локацію...";

//         navigator.geolocation.getCurrentPosition(
//             (position) => {

//                 latInput.value = position.coords.latitude;
//                 lngInput.value = position.coords.longitude;

//                 geoBtn.textContent = "✅ Локацію визначено";
//                 geoBtn.style.backgroundColor = "#4CAF50";
//                 geoBtn.style.color = "white";

//             },
//             (error) => {
//                 geoBtn.textContent = "Помилка геолокації";
//                 alert("Не вдалося отримати геолокацію");
//                 console.log(error);
//             }
//         );
//     });

//     /* =========================
//        CREATE REQUEST
//     ========================== */

//     createBtn.addEventListener("click", async (e) => {

//         e.preventDefault(); // 🔥 ВАЖЛИВО — щоб форма не перезавантажувалась автоматично

//         const title = document.getElementById("title").value.trim();
//         const description = document.getElementById("description").value.trim();
//         const lat = latInput.value;
//         const lng = lngInput.value;

//         if (title.length < 5) {
//             alert("Мінімум 5 символів у заголовку");
//             return;
//         }

//         if (description.length < 10) {
//             alert("Мінімум 10 символів в описі");
//             return;
//         }

//         if (!lat || !lng) {
//             alert("Спочатку визначте геолокацію");
//             return;
//         }

//         try {

//             const formData = new FormData();
//             formData.append("title", title);
//             formData.append("description", description);
//             formData.append("lat", lat);
//             formData.append("lng", lng);

//             const response = await fetch("/add_request", {
//                 method: "POST",
//                 body: formData
//             });

//             if (!response.ok) {
//                 throw new Error("Server error");
//             }

//             const result = await response.json();

//             if (result.success) {
//                 sessionStorage.setItem("requestSuccess", "true");
//                 window.location.reload();
//             } else {
//                 successMessage.innerHTML = "❌ Помилка створення";
//                 successMessage.style.color = "red";
//             }

//         } catch (err) {
//             console.error(err);
//             successMessage.innerHTML = "⚠️ Помилка з'єднання з сервером";
//             successMessage.style.color = "red";
//         }

//     });

// });

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

        const response = await fetch("/api/requests", {   // 🔥 ВИПРАВЛЕНО
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