import { Link, NavLink, Outlet } from 'react-router-dom';

export function SiteLayout() {
  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand__mark">PEA</span>
          <span>
            <strong>Prompt Engineering Academy</strong>
            <small>Теория, практика и быстрый self-check</small>
          </span>
        </Link>

        <nav className="topbar__nav">
          <NavLink to="/">Главная</NavLink>
          <NavLink to="/articles/llm-and-tokens">Статьи</NavLink>
          <NavLink to="/quiz">Итоговый тест</NavLink>
        </nav>
      </header>

      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
