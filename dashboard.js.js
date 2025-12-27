import { supabase } from "./supabaseHelper.js";

/**
 * ✅ Critical: exchange magic-link code for a session
 * This prevents otp_expired/access_denied loops and cleans up redirects.
 */
async function exchangeIfNeeded() {
  // Supabase may return tokens in URL hash or ?code depending on flow.
  // exchangeCodeForSession handles the "code" flow.
  const url = window.location.href;

  // Only attempt exchange if a code param exists
  const hasCode = new URL(url).searchParams.get("code");
  if (!hasCode) return;

  const { error } = await supabase.auth.exchangeCodeForSession(url);
  if (error) {
    console.error("exchangeCodeForSession error:", error);
  }

  // Clean URL (remove ?code=...) after exchange to stop repeated attempts
  const clean = new URL(window.location.href);
  clean.searchParams.delete("code");
  window.history.replaceState({}, document.title, clean.toString());
}

async function requireSessionOrRedirect() {
  await exchangeIfNeeded();

  const { data, error } = await supabase.auth.getSession();
  if (error) console.error("getSession error:", error);

  const session = data?.session;
  if (!session) {
    window.location.replace("/index.html");
    return null;
  }
  return session;
}

function showToast(message, variant = "info") {
  const el = document.getElementById("dashboardToast");
  if (!el) return;
  el.textContent = message;
  el.className = `toast-banner visible ${variant}`;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("visible"), 3500);
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
  localStorage.setItem("yc_theme", theme);
}

// --- Dashboard features (same as your original) ---
const boosts = [
  "You are doing better than you think 💛",
  "Tiny steps are still progress 🌱",
  "Resting is part of healing 🌸",
  "You are growing in calm and confidence 🌿",
  "You deserve the same care you give others 💫",
  "Every breath is a chance to begin again 🌅",
  "Your feelings are valid and temporary 🌙",
  "Small acts of self-care create big changes ✨",
  "You are stronger than you realize 💪",
  "Progress isn't always visible, but it's happening 🌸"
];

function getBoost() {
  const msg = boosts[Math.floor(Math.random() * boosts.length)];
  const el = document.getElementById("boostText");
  if (el) el.textContent = msg;
}

let localSteps = 0;
function loadSteps() {
  const stored = Number(localStorage.getItem("yc_steps") || 0);
  localSteps = Number.isFinite(stored) ? stored : 0;
  const el = document.getElementById("stepsCount");
  if (el) el.textContent = String(localSteps);
}

function addSteps() {
  const input = document.getElementById("addStepsInput");
  const n = Number(input?.value || 0);
  if (!n || n <= 0) return showToast("Please enter a valid number of steps.", "error");
  localSteps += n;
  localStorage.setItem("yc_steps", String(localSteps));
  loadSteps();
  if (input) input.value = "";
}

function logMood(mood) {
  const log = document.getElementById("moodLog");
  const time = new Date().toLocaleTimeString();
  if (log) log.textContent = `Last mood: ${mood} (${time})`;
}

function getEmpatheticReply(text) {
  const lower = text.toLowerCase();
  if (lower.includes("hurt myself") || lower.includes("kill myself") || lower.includes("suicide")) {
    return `I'm really concerned about you 💛 Please reach out for immediate help:<br><br>
    🆘 <strong>Emergency services:</strong> call your local emergency number<br>
    🇬🇧 UK: Samaritans 116 123<br><br>
    You matter. You don’t have to carry this alone. 🌙`;
  }
  if (lower.includes("sad") || lower.includes("tired") || lower.includes("depressed"))
    return "I'm sorry you're feeling that way 💛 It's okay to rest. Small comforts matter.";
  if (lower.includes("happy") || lower.includes("good") || lower.includes("better"))
    return "That’s lovely to hear 🌸 Keep noticing those good moments.";
  if (lower.includes("anxious") || lower.includes("worried") || lower.includes("scared"))
    return "Breathe gently 🌿 Try the 5-4-3-2-1 grounding exercise from the coping library.";
  if (lower.includes("stress") || lower.includes("overwhelmed"))
    return "It sounds like you’re carrying a lot 💫 One small step is enough.";
  return "Thank you for sharing 🌙 I’m here with you.";
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const chatBox = document.getElementById("chatBox");
  const userMsg = input?.value?.trim();
  if (!userMsg || !chatBox) return;

  const userDiv = document.createElement("div");
  userDiv.className = "msg user";
  userDiv.innerHTML = `<strong>You:</strong> ${userMsg}`;
  chatBox.appendChild(userDiv);

  if (input) input.value = "";

  const typingDiv = document.createElement("div");
  typingDiv.className = "msg ai";
  typingDiv.style.opacity = "0.7";
  typingDiv.innerHTML = `<strong>Luna:</strong> <em>typing...</em>`;
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  await new Promise((r) => setTimeout(r, 500));
  typingDiv.remove();

  const reply = document.createElement("div");
  reply.className = "msg ai";
  reply.innerHTML = `<strong>Luna:</strong> ${getEmpatheticReply(userMsg)}`;
  chatBox.appendChild(reply);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function clearChat() {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  chatBox.innerHTML = `<div class="msg ai"><strong>Luna:</strong> Hi there! 💛 I'm Luna. How are you feeling today?</div>`;
}

// --- Donation modal + PayPal ---
const DONATION_PAYPAL_PLANS = {
  2: "P-6PU50610GN123364SNE27HYY",
  5: "P-8J411952AV1634600NE27J6Q"
};

function initDonation() {
  const fab = document.getElementById("donationFab");
  const modal = document.getElementById("donationModal");
  const close = document.getElementById("donationClose");
  const amountBtns = Array.from(document.querySelectorAll(".donate-amount"));

  const getAmt = () => {
    const active = amountBtns.find((b) => b.classList.contains("active")) || amountBtns[0];
    return Number(active?.dataset?.amt || 2);
  };

  amountBtns.forEach((b, i) => {
    if (i === 0) b.classList.add("active");
    b.addEventListener("click", () => {
      amountBtns.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    });
  });

  fab?.addEventListener("click", () => modal && (modal.hidden = false));
  close?.addEventListener("click", () => modal && (modal.hidden = true));
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  if (window.paypal?.Buttons) {
    window.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "rect", label: "subscribe" },
      createSubscription(_data, actions) {
        const amt = getAmt();
        const plan = DONATION_PAYPAL_PLANS[amt];
        if (!plan) {
          showToast("Supported monthly plans are £2 or £5.", "error");
          return undefined;
        }
        return actions.subscription.create({ plan_id: plan });
      },
      onApprove() {
        showToast("Thank you for supporting YouCanHeal 💛", "success");
        if (modal) modal.hidden = true;
      },
      onError(err) {
        console.error("PayPal error:", err);
        showToast("PayPal could not start. Please try again.", "error");
      }
    }).render("#paypal-button-container");
  }
}

// Contact modal
function initContact() {
  const btn = document.getElementById("contactBtn");
  const modal = document.getElementById("contactModal");
  const close = document.getElementById("contactClose");

  const closeIt = () => modal && (modal.hidden = true);
  btn?.addEventListener("click", () => modal && (modal.hidden = false));
  close?.addEventListener("click", closeIt);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeIt();
  });
}

// Cookie banner (single instance)
function initCookies() {
  const banner = document.getElementById("cookie-banner");
  const accept = document.getElementById("cookie-accept");
  if (!banner || !accept) return;
  if (!localStorage.getItem("yc_cookie")) {
    banner.style.display = "block";
    accept.addEventListener("click", () => {
      localStorage.setItem("yc_cookie", "true");
      banner.style.display = "none";
    });
  }
}

async function main() {
  // Theme
  applyTheme(localStorage.getItem("yc_theme") || "light");
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  // Auth guard
  const session = await requireSessionOrRedirect();
  if (!session) return;

  // Remove Supabase error hash from URL if present (makes it look broken)
  if (window.location.hash.includes("error=")) {
    window.history.replaceState({}, document.title, "/dashboard.html");
  }

  // User display
  const usernameEl = document.getElementById("username");
  if (usernameEl) usernameEl.textContent = session.user.email;

  // Sign out
  document.getElementById("signOut")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.replace("/index.html");
  });

  // Init features
  loadSteps();
  getBoost();
  initCookies();
  initDonation();
  initContact();

  // Wire buttons
  window.getBoost = getBoost;
  window.addSteps = addSteps;
  window.logMood = logMood;
  window.sendMessage = sendMessage;
  window.clearChat = clearChat;

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
}

document.addEventListener("DOMContentLoaded", main);
