export function getTesterId(): string {
  // Sørg for vi kun kører i browser
  if (typeof window === "undefined") return "default";

  const STORAGE_KEY = "falcus-tester";

  // 1. Tjek URL (?tester=navn)
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("tester");

  if (fromUrl && fromUrl.trim()) {
    const cleaned = fromUrl.trim().toLowerCase();
    localStorage.setItem(STORAGE_KEY, cleaned);
    return cleaned;
  }

  // 2. Ellers brug det vi har gemt
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  // 3. Fallback
  return "default";
}