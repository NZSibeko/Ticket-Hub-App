const resolveEnv = () =>
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.API_URL ||
  '';

export const getApiBaseUrlSync = (): string => {
  const base = resolveEnv();
  if (!base) {
    // Avoid throwing at import time; allow callers to handle empty base
    console.warn('[API] Missing API base URL. Set EXPO_PUBLIC_API_URL or REACT_APP_API_URL.');
  }
  return base;
};

export default getApiBaseUrlSync;
