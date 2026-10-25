const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { 'content-type': 'application/json', ...(options?.headers || {}) }, ...options });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || 'Request failed.');
  return body;
}
export const api = { profile: () => request('/api/profile'), projects: () => request('/api/projects'), contact: (data) => request('/api/contact', { method: 'POST', body: JSON.stringify(data) }) };

