import api from './client';

export const auth = {
  register: (data: { email: string; password: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  profile: () => api.get('/auth/profile').then((r) => r.data),
};

export const trees = {
  list: () => api.get('/trees').then((r) => r.data),
  create: (name: string) => api.post('/trees', { name }).then((r) => r.data),
  get: (id: number) => api.get(`/trees/${id}`).then((r) => r.data),
  update: (id: number, data: { name?: string }) =>
    api.patch(`/trees/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/trees/${id}`).then((r) => r.data),
  graph: (id: number) => api.get(`/trees/${id}/graph`).then((r) => r.data),
};

export const persons = {
  create: (data: { name: string; gender?: string; treeId: number }) =>
    api.post('/persons', data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.patch(`/persons/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/persons/${id}`).then((r) => r.data),
  listByTree: (treeId: number) =>
    api.get(`/persons/tree/${treeId}`).then((r) => r.data),
};

export const relationships = {
  create: (data: { fromPersonId: number; toPersonId: number; type: string }) =>
    api.post('/relationships', data).then((r) => r.data),
  delete: (id: number) => api.delete(`/relationships/${id}`).then((r) => r.data),
};
