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

const DEFAULT_TIMEOUT_MS = 20000;

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  // Use AbortController to ensure hung requests can't keep the global loader stuck.
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(id);
  }
};

const BASE_URL = normalizeApiBaseUrl(API_BASE_URL);

let activeRequestCount = 0;
const loadingListeners = new Set();

const notifyLoading = () => {
  for (const fn of loadingListeners) {
    try {
      fn(activeRequestCount);
    } catch (e) {
      console.warn('API loading listener failed:', e);
    }
  }
};

const beginRequest = () => {
  activeRequestCount += 1;
  notifyLoading();
};

const endRequest = () => {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  notifyLoading();
};

export const subscribeToApiLoading = (listener) => {
  if (typeof listener !== 'function') return () => {};
  loadingListeners.add(listener);
  listener(activeRequestCount);
  return () => loadingListeners.delete(listener);
};

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
    const response = await fetchWithTimeout(joinUrl(BASE_URL, '/auth/refresh'), {
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
    } catch {
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
      } catch {
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
    const response = await fetchWithTimeout(joinUrl(BASE_URL, endpoint), {
      method: 'GET',
      headers,
    });
    
    // Only attempt token refresh/retry when this request required auth.
    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  beginRequest();
  try {
    return await makeRequest();
  } catch (error) {
    console.error('GET request failed:', error);
    throw error;
  } finally {
    endRequest();
  }
};

export const post = async (endpoint, body, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    const response = await fetchWithTimeout(joinUrl(BASE_URL, endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    // Only attempt token refresh/retry when this request required auth.
    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  beginRequest();
  try {
    return await makeRequest();
  } catch (error) {
    console.error('POST request failed:', error);
    throw error;
  } finally {
    endRequest();
  }
};

export const postForm = async (endpoint, formData, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    // Let the browser set multipart boundaries
    delete headers['Content-Type'];

    const response = await fetchWithTimeout(joinUrl(BASE_URL, endpoint), {
      method: 'POST',
      headers,
      body: formData,
    });

    // Only attempt token refresh/retry when this request required auth.
    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  beginRequest();
  try {
    return await makeRequest();
  } catch (error) {
    console.error('POST form request failed:', error);
    throw error;
  } finally {
    endRequest();
  }
};

export const postFormWithProgress = async (endpoint, formData, onProgress, requireAuth = true) => {
  const makeRequest = async (hasRetried = false) => {
    const token = requireAuth ? await getValidToken() : null;

    const url = joinUrl(BASE_URL, endpoint);

    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.timeout = DEFAULT_TIMEOUT_MS;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (evt) => {
        if (!evt || !evt.lengthComputable) return;
        const pct = Math.round((evt.loaded / evt.total) * 100);
        try {
          onProgress?.(Math.max(0, Math.min(100, pct)));
        } catch {
          // ignore progress callback failures
        }
      };

      xhr.onload = async () => {
        const contentType = xhr.getResponseHeader('content-type') || '';
        let json = null;
        if (contentType.includes('application/json')) {
          try {
            json = JSON.parse(xhr.responseText || '{}');
          } catch {
            json = null;
          }
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json);
          return;
        }

        // Retry once on 401 when auth is required.
        if (xhr.status === 401 && requireAuth && !hasRetried) {
          try {
            await refreshAccessToken();
            const retried = await makeRequest(true);
            resolve(retried);
            return;
          } catch (e) {
            reject(e);
            return;
          }
        }

        reject(new Error(json?.message || xhr.statusText || 'An error occurred'));
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Request timed out'));

      xhr.send(formData);
    });
  };

  beginRequest();
  try {
    return await makeRequest(false);
  } catch (error) {
    console.error('POST form (progress) request failed:', error);
    throw error;
  } finally {
    endRequest();
  }
};

export const put = async (endpoint, body, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    const response = await fetchWithTimeout(joinUrl(BASE_URL, endpoint), {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    // Only attempt token refresh/retry when this request required auth.
    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  beginRequest();
  try {
    return await makeRequest();
  } catch (error) {
    console.error('PUT request failed:', error);
    throw error;
  } finally {
    endRequest();
  }
};

export const del = async (endpoint, requireAuth = true) => {
  const makeRequest = async () => {
    const headers = await getHeaders(requireAuth);
    const response = await fetchWithTimeout(joinUrl(BASE_URL, endpoint), {
      method: 'DELETE',
      headers,
    });
    // Only attempt token refresh/retry when this request required auth.
    return handleResponse(response, requireAuth ? makeRequest : null);
  };

  beginRequest();
  try {
    return await makeRequest();
  } catch (error) {
    console.error('DELETE request failed:', error);
    throw error;
  } finally {
    endRequest();
  }
}

export const upload = async (endpoint, formData) => {
  const makeRequest = async () => {
    const token = await getValidToken();
    const headers = {};

    if (token){
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetchWithTimeout(joinUrl(BASE_URL, endpoint), {
      method: 'POST',
      headers,
      body: formData,
    });

    // Only retry if we actually sent an auth token.
    return handleResponse(response, token ? makeRequest : null);
  };

  beginRequest();
  try {
    return await makeRequest();
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  } finally {
    endRequest();
  }
};

export default { get, post, put, delete: del, upload, postForm, postFormWithProgress };

