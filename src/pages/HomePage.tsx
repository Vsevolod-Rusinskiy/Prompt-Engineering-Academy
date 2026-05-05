import { Link } from 'react-router-dom';
import { articles } from '../content/articles';

export function HomePage() {
  return (
    <div className="page-grid">
      <section className="hero">
        <div>
          <p className="eyebrow">Образовательный портал</p>
          <h1>Учиться через активное прохождение, а не через пассивное чтение.</h1>
          <p className="hero__lead">
            Prompt Engineering Academy соединяет короткие объяснения с упражнениями
            прямо внутри текста. Теперь рядом есть и минимальный режим `Knowledge Journey`:
            вводишь тему или текст, проходишь чекпоинты под таймером и получаешь итоговую сводку.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" to="/journey">
              Запустить Journey
            </Link>
            <Link className="button button--ghost" to="/articles/llm-and-tokens">
              Открыть статьи
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <p>Что внутри</p>
          <ul>
            <li>3 статьи на русском языке с inline-проверками</li>
            <li>Knowledge Journey: setup - run - report</li>
            <li>Таймер на чекпоинт, XP, streak и achievements</li>
            <li>Итоговый тест на 10 вопросов с прогрессом и рекомендациями</li>
          </ul>
        </div>
      </section>

      <section className="article-catalog">
        <div className="section-heading">
          <p className="eyebrow">Маршрут</p>
          <h2>Три обязательные статьи</h2>
        </div>
        <div className="article-cards">
          {articles.map((article) => (
            <article className="article-card" key={article.slug}>
              <p className="article-card__eyebrow">
                {article.eyebrow} • {article.readingTime}
              </p>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <Link className="article-card__link" to={`/articles/${article.slug}`}>
                Читать статью
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
