import { Link } from 'react-router-dom';
import { articles } from '../content/articles';

export function HomePage() {
  return (
    <div className="page-grid">
      <section className="hero">
        <div>
          <p className="eyebrow">Образовательный портал</p>
          <h1>Учиться писать промпты через практику, а не через список шаблонов.</h1>
          <p className="hero__lead">
            Prompt Engineering Academy соединяет короткие объяснения с упражнениями
            прямо внутри текста. Прочитал абзац, сразу проверил понимание, дошёл до
            теста и увидел слабые места.
          </p>
          <div className="hero__actions">
            <Link className="button button--primary" to="/articles/llm-and-tokens">
              Начать с первой статьи
            </Link>
            <Link className="button button--ghost" to="/quiz">
              Открыть итоговый тест
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <p>Что внутри</p>
          <ul>
            <li>3 статьи на русском языке с inline-проверками</li>
            <li>6 типов упражнений, включая кастомный PromptBuilder</li>
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
