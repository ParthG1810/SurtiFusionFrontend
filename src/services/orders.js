import api from './api';

export const place     = data => api.post('/orders', data);
export const history   = () => api.get('/orders/history');
export const daily     = () => api.get('/orders/daily-count');