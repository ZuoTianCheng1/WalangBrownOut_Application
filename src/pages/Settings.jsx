import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getUsers, createUser, updateUser } from '../services/api.js';
export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const save = (patch) => { updateSettings(patch); setSaved(true); setTimeout(()=>setSaved(false),1800); };
  return <div className="container"><p className="kicker">System configuration</p><h1 className="page-title">Settings.</h1><p className="page-lede">Tune alert thresholds and workspace preferences. Changes are saved in this browser.</p>
    <section className="section card settings-card"><h2 className="section-heading">Alert thresholds</h2>
      <div className="form-field"><label htmlFor="expiry-days">Near-expiry window (days)</label><input id="expiry-days" type="number" min="1" max="365" value={settings.nearExpiryDays} onChange={e=>save({nearExpiryDays:Math.max(1,Math.min(365,Number(e.target.value)||1))})}/><small>Used as the preferred threshold for future expiry calculations.</small></div>
      <div className="form-field"><label htmlFor="critical-days">Critical stock lead-time buffer (days)</label><input id="critical-days" type="number" min="0" max="90" value={settings.criticalStockDays} onChange={e=>save({criticalStockDays:Math.max(0,Math.min(90,Number(e.target.value)||0))})}/></div>
      <h2 className="section-heading settings-subhead">Notifications</h2><label className="settings-toggle"><input type="checkbox" checked={settings.emailNotifications} onChange={e=>save({emailNotifications:e.target.checked})}/> Enable email notification preference <span className="muted-note"></span></label>
      <div className="form-field settings-theme"><label htmlFor="theme-select">Appearance</label><select id="theme-select" value={settings.theme} onChange={e=>save({theme:e.target.value})}><option value="dark">Dark</option><option value="light">Light</option></select></div>
      <div className="settings-footer"><small>Signed in as {user?.name} · {user?.role}</small>{saved&&<span className="save-indicator" role="status">Settings saved</span>}</div>
    </section>
    <UserManagement />
  </div>;
}

const ROLES = ['Admin', 'Warehouse Staff', 'Viewer'];

function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'Warehouse Staff' });

  const load = () => getUsers().then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const change = async (id, patch) => {
    setError('');
    try { await updateUser(id, patch); await load(); } catch (e) { setError(e.message); }
  };
  const add = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await createUser(form); setForm({ ...form, name: '', username: '', password: '' }); await load(); }
    catch (err) { setError(err.message); }
    setBusy(false);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="section card settings-card">
      <h2 className="section-heading">User management</h2>
      <p className="section-note">
        <strong>Admin</strong>: everything, including items, users and settings. <strong>Warehouse Staff</strong>: use/adjust stock, resolve alerts, view reports. <strong>Viewer</strong>: read-only. Role changes apply at the user's next sign-in or page reload.
      </p>
      {error && <div className="login-error" role="alert">{error}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            {!users ? <tr><td colSpan="4">Loading users…</td></tr> : users.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id}>
                  <td>{u.name}{self ? ' (you)' : ''}</td>
                  <td className="mono">{u.username}</td>
                  <td>
                    <select aria-label={`Role for ${u.username}`} value={u.role} disabled={self} onChange={(e) => change(u.id, { role: e.target.value })}>
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-ghost" disabled={self} onClick={() => change(u.id, { active: !u.active })}>
                      {u.active ? 'Active — click to disable' : 'Disabled — click to enable'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section-heading settings-subhead">Add user</h2>
      <form onSubmit={add}>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="nu-name">Full name</label><input id="nu-name" value={form.name} onChange={set('name')} required /></div>
          <div className="form-field"><label htmlFor="nu-username">Username</label><input id="nu-username" value={form.username} onChange={set('username')} autoComplete="off" required /></div>
          <div className="form-field"><label htmlFor="nu-password">Temporary password</label><input id="nu-password" type="password" minLength={12} value={form.password} onChange={set('password')} autoComplete="new-password" required /><small>At least 12 characters.</small></div>
          <div className="form-field"><label htmlFor="nu-role">Role</label><select id="nu-role" value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add user'}</button>
      </form>
    </section>
  );
}