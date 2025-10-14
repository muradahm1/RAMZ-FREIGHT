// Helper utilities for computing the app base path and redirect URLs
export function getAppBasePath() {
  const parts = (window.location.pathname || '/').split('/');
  if (parts.length > 1 && parts[1]) return '/' + parts[1];
  return '';
}

export function getRedirectUrl(path) {
  const base = getAppBasePath();
  return `${window.location.origin}${base}${path}`;
}
