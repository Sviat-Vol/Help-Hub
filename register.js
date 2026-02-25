document.addEventListener("DOMContentLoaded", () => {
  const triggers = document.querySelectorAll(".terms-link");
  const closeButtons = document.querySelectorAll(".modal-close");
  const modals = document.querySelectorAll(".modal");

  triggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-modal");
      const modal = document.getElementById(id);
      if (modal) modal.classList.add("open");
    });
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) modal.classList.remove("open");
    });
  });

  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      modals.forEach((modal) => modal.classList.remove("open"));
    }
  });
});