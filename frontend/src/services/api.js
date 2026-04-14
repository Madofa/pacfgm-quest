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
    login:          (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register:       (nom, alias, email, password, rol, subtipus) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ nom, alias, email, password, rol, subtipus }) }),
    me:             () => request('/api/auth/me'),
    perfil:         (alias) => request('/api/auth/perfil', { method: 'PATCH', body: JSON.stringify({ alias }) }),
    forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword:  (token, password) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
    verificarEmail: (token) => request(`/api/auth/verificar-email?token=${encodeURIComponent(token)}`),
    checkAlias:     (alias) => request(`/api/auth/check-alias?alias=${encodeURIComponent(alias)}`),
  },
  progres: {
    meu:           () => request('/api/progres/meu'),
    skillTree:     () => request('/api/progres/skill-tree'),
    revisions:     () => request('/api/progres/revisions'),
    srDots:        () => request('/api/progres/sr-dots'),
    errorsRecents: () => request('/api/progres/errors-recents'),
    errorsCount:   () => request('/api/progres/errors-count'),
    retencio:      () => request('/api/progres/retencio'),
    memoria:          () => request('/api/progres/memoria'),
    ultimesMillores:  () => request('/api/progres/ultimes-millores'),
  },
  pregunta: {
    generar:    (node_id, idioma = 'castella') => request('/api/pregunta/generar', { method: 'POST', body: JSON.stringify({ node_id, idioma }) }),
    resposta:   (sessio_id, resposta, temps_ms) => request('/api/pregunta/resposta', { method: 'POST', body: JSON.stringify({ sessio_id, resposta, temps_ms }) }),
    finalitzar: (sessio_id) => request('/api/pregunta/finalitzar', { method: 'POST', body: JSON.stringify({ sessio_id }) }),
    explicar:        (pregunta_text, opcions, resposta_correcta, node_id) => request('/api/pregunta/explicar', { method: 'POST', body: JSON.stringify({ pregunta_text, opcions, resposta_correcta, node_id }) }),
    analitzarImatge: (payload) => request('/api/pregunta/analitzar-imatge', { method: 'POST', body: JSON.stringify(payload) }),
  },
  grup: {
    leaderboard: () => request('/api/grup/leaderboard'),
    progres:     () => request('/api/grup/progres'),
    meus:        () => request('/api/grup/meus'),
    crear:       (nom) => request('/api/grup/crear', { method: 'POST', body: JSON.stringify({ nom }) }),
    unir:        (codi) => request('/api/grup/unir', { method: 'POST', body: JSON.stringify({ codi }) }),
    peticions:   () => request('/api/grup/peticions'),
    aprovar:     (alumneId) => request(`/api/grup/peticions/${alumneId}/aprovar`, { method: 'PATCH' }),
    rebutjar:    (alumneId) => request(`/api/grup/peticions/${alumneId}`, { method: 'DELETE' }),
    eliminar:    (alumneId) => request(`/api/grup/membres/${alumneId}`, { method: 'DELETE' }),
    informe:     (alumneId) => request(`/api/grup/informe/${alumneId}`),
  },
  familia: {
    vincular:         (alias)   => request('/api/familia/vincular', { method: 'POST', body: JSON.stringify({ alias }) }),
    fills:            ()        => request('/api/familia/fills'),
    desvincular:      (fillId)  => request(`/api/familia/fills/${fillId}`, { method: 'DELETE' }),
    cancellar:        (fillId)  => request(`/api/familia/peticions/${fillId}`, { method: 'DELETE' }),
    informe:          (fillId)  => request(`/api/familia/informe/${fillId}`),
    peticionsRebudes: ()        => request('/api/familia/peticions-rebudes'),
    acceptar:         (pareId)  => request(`/api/familia/peticions/${pareId}/aprovar`, { method: 'PATCH' }),
    rebutjar:         (pareId)  => request(`/api/familia/peticions/${pareId}/rebutjar`, { method: 'DELETE' }),
  },
  feedback: {
    enviar: (tipus, descripcio, url_page) => request('/api/feedback', { method: 'POST', body: JSON.stringify({ tipus, descripcio, url_page }) }),
  },
};
