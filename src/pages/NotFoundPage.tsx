import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404</p>
      <h1>Страница не найдена</h1>
      <p>Проверь адрес или вернись на главную страницу портала.</p>
      <Link className="button button--primary" to="/">
        На главную
      </Link>
    </section>
  );
}
