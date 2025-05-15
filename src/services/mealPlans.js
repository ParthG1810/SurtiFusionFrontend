import api from './api';

export const list   = () => api.get('/meal-plans');
export const create = data => api.post('/meal-plans', data);
export const update = (id, data) => api.put(`/meal-plans/${id}`, data);
export const remove = id => api.delete(`/meal-plans/${id}`);