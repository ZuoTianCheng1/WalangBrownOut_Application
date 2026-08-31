import { apiMode } from '../services/api.js';

/** Small transparency strip: shows whether a section is reading mock
 * data or a live API, so it's obvious what to swap once a backend
 * exists. Safe to delete once USE_MOCK is false everywhere. */
export default function ApiStrip({ label }) {
  return (
    <div className="api-strip">
      <span className="pulse" />
      {label} {'\u2014'} {apiMode()} data
    </div>
  );
}
