import api from './api';

export const list   = () => api.get('/customers');
export const create = data => api.post('/customers', data);
export const update = (id, data) => api.put(`/customers/${id}`, data);
export const remove = id => api.delete(`/customers/${id}`);