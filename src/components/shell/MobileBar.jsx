import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import Icon from '../ui/Icon'

// Bottom tab bar on phones. Worlds live in the scrollable top bar; this holds
// the app-level destinations.
export default function MobileBar({ onSearch }) {
  return (
    <nav
      aria-label="App"
      className="glass fixed inset-x-0 bottom-0 z-50 border-t border-line/70 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-4">
        <Tab to="/" end icon="home" label="Home" />
        <button
          type="button"
          onClick={onSearch}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted active:scale-95"
        >
          <Icon name="search" className="h-[22px] w-[22px]" />
          Search
        </button>
        <Tab to="/stats" icon="chart" label="Stats" />
        <Tab to="/account" icon="settings" label="Settings" />
      </div>
    </nav>
  )
}

function Tab({ to, end, icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors active:scale-95',
          isActive ? 'text-accent' : 'text-muted',
        )
      }
    >
      <Icon name={icon} className="h-[22px] w-[22px]" />
      {label}
    </NavLink>
  )
}
