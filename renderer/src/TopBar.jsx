import SearchBar from './SearchBar.jsx';
import logo from './assets/logo.png';
import './TopBar.css';

export default function TopBar({ search, onSearchChange, onOpenHelp, onOpenSettings }) {
  return (
    <div className="top-bar">
      <div className="top-bar__logo">
        <img className="top-bar__logo-img" src={logo} alt="DJ Manager" draggable={false} />
      </div>

      <div className="top-bar__search">
        <SearchBar value={search} onChange={onSearchChange} />
      </div>

      <div className="top-bar__actions">
        <button
          type="button"
          className="top-bar__link-btn"
          onClick={onOpenHelp}
          title="Help"
          aria-label="Help"
        >
          Help
        </button>
        <button
          type="button"
          className="top-bar__settings-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>
    </div>
  );
}
