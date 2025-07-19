import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthForm.css";
import { toast } from "react-toastify";

const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
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

      if (res.ok && data.message) {
        toast.success("Verification code sent to your email.");
        setShowVerification(true);
        setPendingEmail(email.value);
        setPendingName(username.value);
        setPendingPassword(password.value);
        return;
      } else {
        toast.error(
          data.error + (data.details ? `: ${data.details}` : "") || "Email already registered or registration failed."
        );
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error("Sign up error:", err);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          code: verificationCode,
          name: pendingName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        toast.success("Email verified! You can now sign in.");
        setShowVerification(false);
        setIsSignUp(false);
      } else {
        toast.error(data.error || "Verification failed.");
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error("Verification error:", err);
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
        navigate("/home", { replace: true });
      } else {
        toast.error(data.error || "Login failed");
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error(err);
    }
  };

  const handleResendCode = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Verification code resent to your email.");
      } else {
        toast.error(data.error || "Failed to resend code.");
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error("Resend code error:", err);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Reset code sent to your email.");
        setShowReset(true);
      } else {
        toast.error(data.error || "Failed to send reset code.");
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error("Forgot password error:", err);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          code: resetCode,
          newPassword: resetPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Password reset successful! You can now sign in.");
        setShowForgot(false);
        setShowReset(false);
        setForgotEmail("");
        setResetCode("");
        setResetPassword("");
      } else {
        toast.error(data.error || "Failed to reset password.");
      }
    } catch (err) {
      toast.error("Network error or server not running.");
      console.error("Reset password error:", err);
    }
  };

  return (
    <div className="auth-form-wrapper">
      <div
        className={`container ${isSignUp ? "right-panel-active" : ""}`}
        id="container"
      >
        <div className="form-container sign-up-container">
          {showVerification ? (
            <form onSubmit={handleVerification}>
              <h1>Email Verification</h1>
              <span>Enter the code sent to your email</span>
              <input
                type="text"
                name="code"
                placeholder="Verification Code"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                required
                pattern="[0-9]{6}"
                title="Enter the 6-digit code"
              />
              <button className="auth-form">Verify</button>
              <button type="button" className="auth-form" style={{marginTop: '10px'}} onClick={handleResendCode}>
                Resend Code
              </button>
            </form>
          ) : (
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
          )}
        </div>

        <div className="form-container sign-in-container">
          {showForgot ? (
            showReset ? (
              <form onSubmit={handleResetPassword}>
                <h1>Reset Password</h1>
                <span>Enter the code sent to your email and your new password</span>
                <input
                  type="text"
                  name="resetCode"
                  placeholder="Reset Code"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                  required
                  pattern="[0-9]{6}"
                  title="Enter the 6-digit code"
                />
                <input
                  type="password"
                  name="resetPassword"
                  placeholder="New Password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                  title="Password must be at least 6 characters long"
                />
                <button className="auth-form">Reset Password</button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h1>Forgot Password</h1>
                <span>Enter your email to receive a reset code</span>
                <input
                  type="email"
                  name="forgotEmail"
                  placeholder="Email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                  title="Please enter a valid email address"
                />
                <button className="auth-form">Send Reset Code</button>
                <button type="button" className="auth-form" style={{marginTop: '10px'}} onClick={() => setShowForgot(false)}>
                  Back to Sign In
                </button>
              </form>
            )
          ) : (
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
              <a href="#" onClick={e => { e.preventDefault(); setShowForgot(true); }}>Forgot your password?</a>
              <button className="auth-form">Sign In</button>
            </form>
          )}
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
