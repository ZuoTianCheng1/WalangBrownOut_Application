import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container">
      <p className="kicker">404</p>
      <h1 className="page-title">That page isn't in the blueprint.</h1>
      <p className="page-lede">
        <Link to="/" style={{ color: 'var(--amber)' }}>Back to the overview</Link>
      </p>
    </div>
  );
}
