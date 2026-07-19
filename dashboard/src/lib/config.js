// Where "Download Now" on the landing page sends people to install the Reading
// Gate browser extension. Override with VITE_EXTENSION_URL once the extension is
// published (e.g. its Chrome Web Store listing). Defaults to the Web Store home
// until then.
export const EXTENSION_URL =
  import.meta.env.VITE_EXTENSION_URL || "https://chromewebstore.google.com/";
