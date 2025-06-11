// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // 🔁 update this if your backend URL differs
});

export default api;
