const GOOGLE_DRIVE_FILE_REGEX = /https:\/\/drive\.google\.com\/file\/d\/([^/]+)\//i;
const GOOGLE_DRIVE_OPEN_REGEX = /https:\/\/drive\.google\.com\/open\?id=([^&]+)/i;
const GOOGLE_DRIVE_UC_REGEX = /https:\/\/drive\.google\.com\/uc\?id=([^&]+)/i;

function buildGoogleDriveDirectLink(fileId) {
  if (!fileId) return null;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const matchFile = trimmed.match(GOOGLE_DRIVE_FILE_REGEX);
  if (matchFile) {
    return buildGoogleDriveDirectLink(matchFile[1]);
  }

  const matchOpen = trimmed.match(GOOGLE_DRIVE_OPEN_REGEX);
  if (matchOpen) {
    return buildGoogleDriveDirectLink(matchOpen[1]);
  }

  const matchUc = trimmed.match(GOOGLE_DRIVE_UC_REGEX);
  if (matchUc) {
    return buildGoogleDriveDirectLink(matchUc[1]);
  }

  return trimmed;
}

export function buildAudioSource(value) {
  const resolved = resolveMediaUrl(value);
  if (!resolved) {
    return null;
  }
  if (/^https?:\/\//i.test(resolved)) {
    return resolved;
  }
  return resolved;
}
