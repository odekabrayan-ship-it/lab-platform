import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || (`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}`);
export const PORTAL_BASE = import.meta.env.VITE_PORTAL_URL || (`${import.meta.env.VITE_PORTAL_URL || 'http://localhost:3001'}`);

const API = axios.create({
  baseURL: API_BASE, // your backend
});

// attach token if exists
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;
