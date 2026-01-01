import { API_BASE_URL, STORAGE_KEYS } from "../constants/config.js";

const normalizeApiBaseUrl = (baseUrl) => {
  const raw = String(baseUrl || '').trim();
  if (!raw) return '';

  const withoutTrailingSlash = raw.endsWith('/') ? raw.slice(0, -1) : raw;

  if (withoutTrailingSlash.endsWith('/api')) return withoutTrailingSlash;
  return `${withoutTrailingSlash}/api`;
};

const joinUrl = (baseUrl, endpoint) => {
  const ep = String(endpoint || '');
  const normalizedEndpoint = ep.startsWith('/') ? ep : `/${ep}`;
  return `${baseUrl}${normalizedEndpoint}`;
};

const BASE_URL = normalizeApiBaseUrl(API_BASE_URL);

// get access token
const getAccessToken = () => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

// get refresh token
const getRefreshToken = () => {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

// check if token is expired
const isTokenExpired = () => {
  const expiryTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

  if (!expiryTime) return true;

  const bufferTime = 5 * 60 * 1000; // 5 minutes allowance before token expiration
  return Date.now() >= (parseInt(expiryTime) - bufferTime);
};

const refreshAccessToken = async () => {
  try {
    const refeshToken = getRefreshToken();

    if (!refeshToken) {
      throw new Error('No refresh token available');
    }

    // call supabase refresh endpoint
    const response = await fetch(joinUrl(BASE_URL, '/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refeshToken })
    });
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to refresh token');
    }

    // store new access tokens
    const { access_token, refresh_token, expires_in } = data.data.session;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

    // calculate and set expiry time
    const expiryTime = Date.now() + (expires_in * 1000);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

    return access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.USER);
    window.location.href = '/login';
    throw error;
  }
};

const getValidToken = async () => {
  let token = getAccessToken();

  // if token is expired or about to expire, refresh token
  if (token && isTokenExpired()) {
    try {
      token = await refreshAccessToken();
    } catch (error) {
      return null;
    }
  }

  return token;
};

// build headers to include auth token
const getHeaders = async (includeAuth = true) => {
  const headers = { 'Content-Type': 'application/json' };

  if (includeAuth) {
    const token = await getValidToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    };
  };

  return headers;
};

// handle api response and errors
const handleResponse = async (response, retryFn = null) => {
  const data = await response.json();

  // if response is not okay, throw an error
  if (!response.ok) {
    // if 401 authorized, try refreshing token once
    if (response.status === 401 && retryFn) {
      try {
        await refreshAccessToken();
        // retry the original request with new token
        return await retryFn();
      } catch (error) {
        // refresh failed, redirect to login
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
        localStorage.removeItem(STORAGE_KEYS.USER);
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    }
    
    throw new Error(data.message || 'An error occurred');
  }

  return data;
};

export const get = async (endpoint, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    const response = await fetch(joinUrl(BASE_URL, endpoint), {
      method: 'GET',
      headers,
    });

    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  try {
    return await makeRequest();
  } catch (error) {
    console.error('GET request failed:', error);
    throw error;
  }
};

export const post = async (endpoint, body, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    const response = await fetch(joinUrl(BASE_URL, endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  try {
    return await makeRequest();
  } catch (error) {
    console.error('POST request failed:', error);
    throw error;
  }
};

export const put = async (endpoint, body, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    const response = await fetch(joinUrl(BASE_URL, endpoint), {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  try {
    return await makeRequest();
  } catch (error) {
    console.error('PUT request failed:', error);
    throw error;
  }
};

export const del = async (endpoint, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    const response = await fetch(joinUrl(BASE_URL, endpoint), {
      method: 'DELETE',
      headers,
    });

    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  try {
    return await makeRequest();
  } catch (error) {
    console.error('DELETE request failed:', error);
    throw error;
  }
}

export const upload = async (endpoint, formData) => {
  const makeRequest = async () => {
    const token = await getValidToken();
    const headers = {};

    if (token){
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(joinUrl(BASE_URL, endpoint), {
      method: 'POST',
      headers,
      body: formData,
    });

    return handleResponse(response, makeRequest);
  };

  try {
    return await makeRequest();
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};

export default { get, post, put, delete: del, upload };

