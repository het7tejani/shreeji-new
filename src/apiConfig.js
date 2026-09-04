// This configuration determines the base URL for API requests.

const LIVE_API_URL = "https://shreeji-masala.onrender.com";
const LOCAL_API_URL = "http://127.0.0.1:5001";

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 are considered localhost for IPv4.
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// If running locally, use local backend to access new features (like WhatsApp)
// If running on Vercel/Netlify, use the live Render backend
const API_BASE_URL = isLocalhost ? LOCAL_API_URL : LIVE_API_URL;

// Remove trailing slash if present to avoid double slashes (e.g., .com//api)
export default API_BASE_URL.replace(/\/$/, '');
