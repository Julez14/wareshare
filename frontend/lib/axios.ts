import axios from "axios";

// Create a base API client with a default base URL
export const api = axios.create({
  baseURL:
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787"}/api`,
  timeout: 30000,
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);
