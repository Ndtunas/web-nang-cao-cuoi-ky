const BASE_URL = '/api/v1';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function request(url, options = {}) {
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(`${BASE_URL}${url}`, config);

    let result = {};
    try {
      result = await response.json();
    } catch {
      /* non-JSON response */
    }

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!url.includes('/auth/login') && window.location.pathname !== '/login') {
        window.location.reload();
      }
    }

    if (!response.ok) {
      throw {
        statusCode: response.status,
        errorCode: result.errorCode || 'ERR_UNKNOWN',
        i18nKey: result.i18nKey || 'error.unknown',
        message: result.message || 'Request failed',
      };
    }

    return result.data !== undefined ? result.data : result;
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('API Request Error:', error);
    throw {
      statusCode: 500,
      errorCode: 'ERR_CONNECTION',
      i18nKey: 'error.connection',
      message: 'Failed to connect to backend api.',
    };
  }
}
