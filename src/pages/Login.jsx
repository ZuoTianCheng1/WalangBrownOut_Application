import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = (e) => {
    e.preventDefault();
    const result = login(username.trim(), password);
    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-mark"><LockKeyhole size={20} /></div>
        <p className="kicker">WalangBrownout IMS</p>
        <h1>Sign in to continue</h1>
        <p className="login-copy">Enter your credentials to access the inventory dashboard.</p>

        <form className="login-form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Username"
              required
              autoFocus
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              required
            />
          </div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="btn btn-primary login-submit" type="submit">
            <LogIn size={16} /> Sign in
          </button>
        </form>

        <div className="login-hint">
          Demo access: <span className="mono">admin</span> / <span className="mono">admin123</span>
        </div>
      </div>
    </div>
  );
}
