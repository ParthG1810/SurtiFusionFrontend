import axios from "axios";
import { useNotification } from "../context/NotificationContext";

const api = axios.create({ baseURL: "http://localhost:5000/api" });

// Response interceptor for global error notifications
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Cannot use hook here; instead, clients catch and notify
    return Promise.reject(err);
  }
);

export default api;
