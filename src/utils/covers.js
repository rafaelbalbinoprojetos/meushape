const DRIVE_HOST_SNIPPETS = [
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
];
const DRIVE_CDN_BASE = "https://lh3.googleusercontent.com/d/";
const DRIVE_ID_PATTERN = /[-\w]{10,}/;
const DEFAULT_COVER_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236c63ff'/%3E%3Cstop offset='100%25' stop-color='%23b38b59'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='600' rx='32' fill='url(%23g)'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Helvetica,Arial,sans-serif' font-size='44' opacity='0.9'%3EMEU%20SHAPE%3C/text%3E%3C/svg%3E";

function buildDriveDirectUrl(id) {
  if (!id) return "";
  return `${DRIVE_CDN_BASE}${id}`;
}

function extractDriveId(text = "") {
  if (!text) return "";
  const match = text.match(DRIVE_ID_PATTERN);
  return match ? match[0] : "";
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function normalizeDriveUrl(value) {
  try {
    const url = new URL(value);
    if (DRIVE_HOST_SNIPPETS.some((host) => url.hostname.includes(host))) {
      const idFromQuery = url.searchParams.get("id");
      const idFromPath = extractDriveId(url.pathname);
      const fileId = idFromQuery || idFromPath;
      if (fileId) {
        return buildDriveDirectUrl(fileId);
      }
    }
    return url.href;
  } catch {
    return value;
  }
}

/**
 * Normalizes cover URLs so that we can embed them without running into Drive redirects
 * or whitespace issues. Accepts full URLs, bare IDs or relative file names.
 */
export function normalizeCoverUrl(rawValue) {
  const value = typeof rawValue === "string" ? rawValue.trim() : "";
  if (!value) return "";

  if (value.startsWith("//")) {
    return normalizeCoverUrl(`https:${value}`);
  }

  if (DRIVE_HOST_SNIPPETS.some((host) => value.startsWith(host))) {
    return normalizeCoverUrl(`https://${value}`);
  }

  if (isRemoteUrl(value)) {
    return normalizeDriveUrl(value);
  }

  const bareId = extractDriveId(value);
  if (bareId && bareId.length === value.length) {
    return buildDriveDirectUrl(bareId);
  }

  return value;
}

export function ensureCoverSrc(rawValue, fallback = DEFAULT_COVER_PLACEHOLDER) {
  return normalizeCoverUrl(rawValue) || fallback;
}

export { DEFAULT_COVER_PLACEHOLDER };
