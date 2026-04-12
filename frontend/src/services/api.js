const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw { status: res.status, error: data.error || 'Error desconegut' };
  return data;
}

// Auth
export const api = {
  auth: {
    login:    (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (nom, alias, email, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ nom, alias, email, password }) }),
    me:       () => request('/api/auth/me'),
  },
  progres: {
    meu:       () => request('/api/progres/meu'),
    skillTree: () => request('/api/progres/skill-tree'),
  },
  pregunta: {
    generar:    (node_id, idioma = 'castella') => request('/api/pregunta/generar', { method: 'POST', body: JSON.stringify({ node_id, idioma }) }),
    resposta:   (sessio_id, resposta, temps_ms) => request('/api/pregunta/resposta', { method: 'POST', body: JSON.stringify({ sessio_id, resposta, temps_ms }) }),
    finalitzar: (sessio_id) => request('/api/pregunta/finalitzar', { method: 'POST', body: JSON.stringify({ sessio_id }) }),
  },
  grup: {
    leaderboard: () => request('/api/grup/leaderboard'),
    progres:     () => request('/api/grup/progres'),
  },
};
