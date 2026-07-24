(function () {
  "use strict";

  /* —— Staggered reveal (mirrors main site intro) —— */
  function playReveals() {
    const items = document.querySelectorAll(".reveal");
    items.forEach(function (el, index) {
      window.setTimeout(function () {
        el.classList.add("is-visible");
      }, 120 + index * 140);
    });
  }

  /* —— Soft starfield on the nebula —— */
  function initStars() {
    const canvas = document.getElementById("stars");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let stars = [];
    let rafId = 0;
    let width = 0;
    let height = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      const count = Math.floor((width * height) / 16000);
      stars = [];
      for (let i = 0; i < count; i++) {
        // Only in the right ~45% where artwork is visible
        const xBias = Math.pow(Math.random(), 0.7);
        stars.push({
          x: width * (0.55 + xBias * 0.45),
          y: Math.random() * height,
          r: Math.random() * 1.4 + 0.25,
          a: Math.random() * 0.5 + 0.12,
          speed: Math.random() * 0.008 + 0.002,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = 0.55 + 0.45 * Math.sin(time * s.speed + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255," + s.a * twinkle + ")";
        ctx.fill();
      }
      rafId = window.requestAnimationFrame(draw);
    }

    resize();
    rafId = window.requestAnimationFrame(draw);

    let resizeTimer = 0;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    });

    window.addEventListener(
      "beforeunload",
      function () {
        window.cancelAnimationFrame(rafId);
      },
      { once: true }
    );
  }

  /* —— Email notify form —— */
  function initForm() {
    const form = document.getElementById("notify-form");
    const input = document.getElementById("email");
    const message = document.getElementById("notify-message");
    if (!form || !input || !message) return;

    function showMessage(text, isError) {
      message.textContent = text;
      message.classList.toggle("is-error", Boolean(isError));
      message.classList.add("is-visible");
    }

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const email = input.value.trim();

      if (!email) {
        showMessage("Please enter your email address.", true);
        input.focus();
        return;
      }

      if (!isValidEmail(email)) {
        showMessage("Please enter a valid email address.", true);
        input.focus();
        return;
      }

      const stored = JSON.parse(localStorage.getItem("stavarklingNotify") || "[]");
      if (stored.indexOf(email.toLowerCase()) === -1) {
        stored.push(email.toLowerCase());
        localStorage.setItem("stavarklingNotify", JSON.stringify(stored));
      }

      showMessage("You will be the first to know.", false);
      form.reset();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    playReveals();
    initStars();
    initForm();
  });
})();
