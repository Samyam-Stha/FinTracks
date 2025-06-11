import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthForm.css";
import { toast } from "react-toastify";

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    const { username, email, password } = e.target;

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: username.value,
          email: email.value,
          password: password.value,
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        toast.success("Sign up successful! Please sign in.");
        setIsSignUp(false);
        return;
      } else {
        toast.error(
          data.error || "Email already registered or registration failed."
        );
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error("Sign up error:", err);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const { email, password } = e.target;

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
        }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        navigate("/home");
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error(err);
    }
  };

  return (
    <div className="auth-form-wrapper">
      <div
        className={`container ${isSignUp ? "right-panel-active" : ""}`}
        id="container"
      >
        <div className="form-container sign-up-container">
          <form onSubmit={handleSignUp}>
            <h1>Create Account</h1>
            <span>or use your email for registration</span>
            <input
              type="text"
              name="username"
              placeholder="Username"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
              title="Please enter a valid email address"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              minLength={6}
              title="Password must be at least 6 characters long"
            />
            <button className="auth-form">Sign Up</button>
          </form>
        </div>

        <div className="form-container sign-in-container">
          <form onSubmit={handleSignIn}>
            <h1>Sign in</h1>
            <span>or use your account</span>
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
              title="Please enter a valid email address"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              minLength={6}
              title="Password must be at least 6 characters long"
            />
            <a href="#">Forgot your password?</a>
            <button className="auth-form">Sign In</button>
          </form>
        </div>

        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Welcome Back!</h1>
              <p className="auth-p">
                To keep connected with us please login with your personal info
              </p>
              <button className="ghost" onClick={() => setIsSignUp(false)}>
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Hello, Friend!</h1>
              <p className="auth-p">
                Enter your personal details and start your journey with us
              </p>
              <button className="ghost" onClick={() => setIsSignUp(true)}>
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
