import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import App from "./App"; // your dashboard
import AuthForm from "./Components/Auth/AuthForm";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute";

export default function RouterComponent() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthForm />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
