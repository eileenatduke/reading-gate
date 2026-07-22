// Where every "Add to Chrome" button (landing hero + About) sends people to
// install the Reading Gate browser extension. Defaults to the published Chrome
// Web Store listing; override with VITE_EXTENSION_URL if the listing ever moves.
export const EXTENSION_URL =
  import.meta.env.VITE_EXTENSION_URL ||
  "https://chromewebstore.google.com/detail/mdedblcliibkfepcipmciagabdelnnlh";
