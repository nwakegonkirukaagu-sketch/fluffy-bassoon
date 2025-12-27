import { supabase } from "./supabaseHelper.js";

/* ---------------- Theme toggle ---------------- */
const themeToggle = document.getElementById("themeToggle");
const applyTheme = (t) => {
  document.body.dataset.theme = t;
  themeToggle.textContent = t === "dark" ? "☀️ Light" : "🌙 Dark";
  localStorage.setItem("yc_theme", t);
};
applyTheme(localStorage.getItem("yc_theme") || "light");
themeToggle.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

/* ---------------- Cookie banner ---------------- */
const cookieBanner = document.getElementById("cookie-banner");
const cookieAccept = document.getElementById("cookie-accept");
if (!localStorage.getItem("yc_cookie")) {
  cookieBanner.style.display = "block";
  cookieAccept.addEventListener("click", () => {
    localStorage.setItem("yc_cookie", "true");
    cookieBanner.style.display = "none";
  });
}

/* ---------------- Modals ---------------- */
const supportBtn = document.getElementById("supportBtn");
const contactBtn = document.getElementById("contactBtn");

const supportModal = document.getElementById("supportModal");
const contactModal = document.getElementById("contactModal");

const supportClose = document.getElementById("supportClose");
const contactClose = document.getElementById("contactClose");

const openModal = (m) => m.classList.add("open");
const closeModal = (m) => m.classList.remove("open");

supportBtn.addEventListener("click", () => openModal(supportModal));
contactBtn.addEventListener("click", () => openModal(contactModal));
supportClose.addEventListener("click", () => closeModal(supportModal));
contactClose.addEventListener("click", () => closeModal(contactModal));

supportModal.addEventListener("click", (e) => { if (e.target === supportModal) closeModal(supportModal); });
contactModal.addEventListener("click", (e) => { if (e.target === contactModal) closeModal(contactModal); });

/* ---------------- Magic link login ---------------- */
const form = document.getElementById("magicForm");
const msg = document.getElementById("formMessage");

const showMsg = (text, variant) => {
  msg.textContent = text;
  msg.className = variant;
  msg.style.display = "block";
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.style.display = "none";

  const email = document.getElementById("email").value.trim();
  const consent = document.getElementById("consent").checked;

  if (!consent) return showMsg("Please tick the consent box.", "error");
  if (!email || !email.includes("@")) return showMsg("Please enter a valid email address.", "error");

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://youcanheal.co.uk/dashboard.html"
      }
    });
    if (error) throw error;
    showMsg("Magic link sent! Check your email (and spam).", "success");
  } catch (err) {
    console.error("Supabase OTP error:", err);
    showMsg(err?.message || "Unable to send magic link. Check Supabase settings.", "error");
  }
});

/* ---------------- Donation (PayPal plans) ---------------- */
const PAYPAL_PLANS = {
  2: "P-6PU50610GN123364SNE27HYY",
  5: "P-8J411952AV1634600NE27J6Q"
};

const pills = Array.from(document.querySelectorAll(".pill"));
const getSelectedAmt = () => Number((pills.find(p => p.classList.contains("active")) || pills[0]).dataset.amt);

pills.forEach((p, i) => {
  if (i === 0) p.classList.add("active");
  p.addEventListener("click", () => {
    pills.forEach(x => x.classList.remove("active"));
    p.classList.add("active");
  });
});

if (window.paypal?.Buttons) {
  window.paypal.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", label: "subscribe" },
    createSubscription(_data, actions) {
      const amt = getSelectedAmt();
      const plan_id = PAYPAL_PLANS[amt];
      if (!plan_id) {
        alert("Please select £2 or £5.");
        return;
      }
      return actions.subscription.create({ plan_id });
    },
    onApprove() {
      alert("Thank you for supporting YouCanHeal 💛");
      closeModal(supportModal);
    },
    onError(err) {
      console.error("PayPal error", err);
      alert("PayPal could not start the subscription. Please try again.");
    }
  }).render("#paypal-button-container");
} else {
  console.warn("PayPal SDK not available");
}
