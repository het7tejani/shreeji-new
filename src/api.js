import API_BASE_URL from './apiConfig';

// Read the stored session ({ username, token }) saved at login.
export const getSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user'));
  } catch (e) {
    return null;
  }
};

// Wrapper around fetch for authenticated API calls.
// - Attaches the session token as a Bearer header when present.
// - On 401 (missing/expired session once backend enforcement is on), clears the
//   session and returns to the login screen instead of failing silently.
// - Pass { redirectOn401: false } for calls where 401 means "wrong password"
//   (e.g. verify endpoints), not an expired session.
export const apiFetch = async (path, options = {}, { redirectOn401 = true } = {}) => {
  const session = getSession();
  const headers = { ...(options.headers || {}) };
  if (session && session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401 && redirectOn401) {
    sessionStorage.removeItem('user');
    window.location.reload();
    throw new Error('Session expired. Please log in again.');
  }

  return response;
};
