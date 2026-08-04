import api, { API_BASE } from './client';
import axios from 'axios';

export const auth = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  profile: () => api.get('/auth/profile').then((r) => r.data),
  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch('/auth/profile', data).then((r) => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/profile/password', data).then((r) => r.data),
  uploadAvatar: (formData: FormData) =>
    api.post('/auth/profile/avatar', formData, {
      headers: { 'Content-Type': undefined },
    }).then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    api.post(`/auth/reset-password/${token}`, { password }).then((r) => r.data),
};

export const feedback = {
  send: (formData: FormData) =>
    api.post('/feedback', formData, {
      // Let the browser set the multipart boundary automatically
      headers: { 'Content-Type': undefined },
    }).then((r) => r.data),
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
  uploadPhoto: (personId: number, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return axios.post(`${API_BASE}/upload/${personId}`, form, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then((r) => r.data);
  },
};

export const relationships = {
  create: (data: { fromPersonId: number; toPersonId: number; type: string }) =>
    api.post('/relationships', data).then((r) => r.data),
  delete: (id: number) => api.delete(`/relationships/${id}`).then((r) => r.data),
};
