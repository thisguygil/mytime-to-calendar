// background/auth.js
// OAuth via launchWebAuthFlow (implicit flow) + token caching in chrome.storage.local

const WEB_CLIENT_ID = "1098807992576-mgsjfcr18nd9s0b4bv2g8hvhikh94fdk.apps.googleusercontent.com";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

const STORAGE_KEY = "tmc_oauth_implicit_v1";

function randomState() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function launchWebAuthFlow(url, interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive }, (responseUrl) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!responseUrl) return reject(new Error("No response URL returned"));
      resolve(responseUrl);
    });
  });
}

function storageGet(key) {
  return new Promise((resolve) => chrome.storage.local.get([key], resolve));
}
function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}
function storageRemove(key) {
  return new Promise((resolve) => chrome.storage.local.remove([key], resolve));
}

/**
 * Token record:
 * { access_token: string, expires_at: number }
 */
async function loadTokenRecord() {
  const obj = await storageGet(STORAGE_KEY);
  return obj?.[STORAGE_KEY] || null;
}
async function saveTokenRecord(rec) {
  await storageSet({ [STORAGE_KEY]: rec });
}
async function clearTokenRecord() {
  await storageRemove(STORAGE_KEY);
}

/**
 * Returns an access token (string).
 * If interactive=false and no valid cached token exists, throws.
 */
async function getValidAccessToken({ interactive }) {
  const rec = await loadTokenRecord();
  const skewMs = 60_000;

  if (rec?.access_token && rec?.expires_at && rec.expires_at - Date.now() > skewMs) {
    return rec.access_token;
  }

  if (!interactive) throw new Error("No valid token available (non-interactive)");

  // NOTE: whitelist this exact redirect (including /oauth2) in your Web OAuth client
  const redirectUri = chrome.identity.getRedirectURL("oauth2");
  const state = randomState();

  const authUrl = new URL(AUTH_ENDPOINT);
  authUrl.searchParams.set("client_id", WEB_CLIENT_ID);
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  const responseUrl = await launchWebAuthFlow(authUrl.toString(), true);

  const u = new URL(responseUrl);
  const frag = new URLSearchParams((u.hash || "").replace(/^#/, ""));

  const err = frag.get("error") || u.searchParams.get("error");
  if (err) throw new Error(`OAuth error: ${err}`);

  const returnedState = frag.get("state") || u.searchParams.get("state");
  if (returnedState !== state) throw new Error("OAuth state mismatch");

  const accessToken = frag.get("access_token");
  const expiresIn = Number(frag.get("expires_in") || "3600");
  if (!accessToken) throw new Error("No access_token returned from OAuth");

  await saveTokenRecord({
    access_token: accessToken,
    expires_at: Date.now() + expiresIn * 1000,
  });

  return accessToken;
}

// Expose on globalThis so background.js/calendarApi.js can call them
globalThis.TMC_AUTH = {
  getValidAccessToken,
  clearTokenRecord,
};
