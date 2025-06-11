import React from "react";
import ReactDOM from "react-dom/client";
import Router from "./Router"; // <- updated name
import "./index.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
    <ToastContainer position="top-center" autoClose={3000} />
  </React.StrictMode>
);
