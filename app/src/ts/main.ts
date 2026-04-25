/**
 * App entry point — standalone TypeScript, no framework.
 * Bundled by Vite at build time.
 */

import { MockAuthService } from "./services/mock-auth";

// Initialize the Auth Service (swappable for Cognito in prod)
const auth = new MockAuthService();

/** Format seconds into a human-readable uptime string */
export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function updateAuthUI() {
  const statusEl = document.getElementById("auth-status");
  const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
  
  if (auth.isAuthenticated()) {
    const user = auth.getCurrentUser();
    if (statusEl) {
      statusEl.innerHTML = `<span class="badge">Live</span> Authenticated as ${user?.email}`;
    }
    if (loginBtn) loginBtn.style.display = "none";
  } else {
    if (statusEl) statusEl.innerHTML = `<span class="badge badge-error">Locked</span> Authentication Required`;
    if (loginBtn) loginBtn.style.display = "block";
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const counterEl = document.getElementById("uptime-counter");
    const loginBtn = document.getElementById("login-btn");
    let uptime = 0;

    updateAuthUI();

    if (loginBtn) {
      loginBtn.addEventListener("click", async () => {
        loginBtn.innerHTML = "Scanning Fingerprint...";
        await auth.biometricChallenge();
        loginBtn.innerHTML = "Biometric Login";
        updateAuthUI();
      });
    }

    setInterval(() => {
      uptime++;
      if (counterEl) {
        counterEl.textContent = formatUptime(uptime);
      }
    }, 1000);
  });
}
