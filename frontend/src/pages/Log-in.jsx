import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import landingPageBackground from "../public/Landing Page.png";
import "../Components/design/Log-in.css";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    const identifier = email.trim();
    const loginEmail = identifier.includes("@") ? identifier : `${identifier}@nodeguard.local`;
    const result = await login(loginEmail, password);
    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate(result.user.role === "ADMIN" ? "/admin" : "/analyst");
  };

  return (
    <div className="login-container">
      <section
        className="left-section"
        style={{
          backgroundImage: `url("${landingPageBackground}")`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
    <div className="left-section-text">
        <h1>Preserving Truth, Securing Trust</h1>
        <p>Every byte accounted for, every artifact cryptographically secured.</p>
     </div>
      </section>

      <section className="right-section">
        <header>
          <h2>Officer &amp; Staff Login</h2>
          <p>Official staff portal to verify evidence checksums and manage case investigations.</p>
        </header>

        <form id="login-form" onSubmit={handleLogin}>
          <div className="field">
            <label htmlFor="email">Username or Email</label>
            <input
              className="input-field"
              type="text"
              id="email"
              name="email"
              placeholder="Enter username or email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrap">
              <input
                className="input-field"
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                className="toggle"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {error && <p role="alert">{error}</p>}
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </section>
    </div>
  );
}