import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuth, authRoleTarget, login, signup } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const roleLabel = authRoleTarget === 'seller' ? 'Seller' : 'Buyer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Connecting to Supabase...');
    setLoading(true);

    try {
      if (isSignUp) {
        await signup(email.trim(), password, authRoleTarget);
      } else {
        await login(email.trim(), password, authRoleTarget);
      }
      setEmail('');
      setPassword('');
      setStatus('');
    } catch (err) {
      setStatus(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setStatus('');
  };

  return (
    <section className="auth-modal open">
      <div className="auth-card">
        <div className="auth-head">
          <div>
            <span className="auth-role" id="auth-role">
              {roleLabel}
            </span>
            <h2 id="auth-title">
              {isSignUp ? 'Create your sample account' : 'Sign in to LocalBites'}
            </h2>
          </div>
          <button
            className="close-cart"
            id="auth-close"
            type="button"
            onClick={closeAuth}
          >
            &times;
          </button>
        </div>
        <p>Use your LocalBites sample account.</p>

        <form className="auth-form" id="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              id="auth-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {status && (
            <div className="auth-status" id="auth-status">
              {status}
            </div>
          )}

          <button type="submit" id="auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
          <button
            type="button"
            className="auth-switch"
            id="auth-switch"
            onClick={handleToggleMode}
          >
            {isSignUp ? 'I already have an account' : 'Create a sample account'}
          </button>
        </form>
      </div>
    </section>
  );
}
