import { usePlayer } from './PlayerContext.jsx';
import logo from './assets/logo.png';
import './TopBar.css';

export default function TopBar({ onOpenSettings, onLogoClick }) {
  const { isPlaying, shuffle, repeat, togglePlay, next, prev, toggleShuffle, cycleRepeat } =
    usePlayer();

  return (
    <div className="top-bar">
      <div
        className="top-bar__logo"
        onClick={onLogoClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onLogoClick?.();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <img className="top-bar__logo-img" src={logo} alt="DJ Manager" draggable={false} />
      </div>

      <div className="top-bar__controls">
        <button
          className={`top-bar__btn top-bar__btn--toggle${shuffle ? ' top-bar__btn--active' : ''}`}
          onClick={toggleShuffle}
          title="Shuffle"
        >
          ⇄
        </button>
        <button className="top-bar__btn" onClick={prev} title="Previous">
          ⏮
        </button>
        <button
          className="top-bar__btn top-bar__btn--play"
          onClick={togglePlay}
          title="Play / Pause"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="top-bar__btn" onClick={next} title="Next">
          ⏭
        </button>
        <button
          className={`top-bar__btn top-bar__btn--toggle${repeat !== 'none' ? ' top-bar__btn--active' : ''}`}
          onClick={cycleRepeat}
          title={`Repeat: ${repeat}`}
        >
          {repeat === 'one' ? '↺¹' : '↺'}
        </button>
      </div>

      <div className="top-bar__actions">
        <button className="top-bar__settings-btn" onClick={onOpenSettings} title="Settings">
          ⚙
        </button>
      </div>
    </div>
  );
}
