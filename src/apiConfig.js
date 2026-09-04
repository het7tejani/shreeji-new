// This configuration determines the base URL for API requests.

const LIVE_API_URL = "https://shreeji-backend-xmfq.onrender.com";
const hostname = window.location.hostname;

const isLocalhost = Boolean(
  hostname === 'localhost' ||
    hostname === '[::1]' ||
    hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/) ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local')
);

const LOCAL_API_URL = `http://${hostname === 'localhost' ? '127.0.0.1' : hostname}:5001`;

// If running locally, use local backend to access new features (like WhatsApp)
// If running on Vercel/Netlify, use the live Render backend
const API_BASE_URL = isLocalhost ? LOCAL_API_URL : LIVE_API_URL;

// Remove trailing slash if present to avoid double slashes (e.g., .com//api)
export default API_BASE_URL.replace(/\/$/, '');
