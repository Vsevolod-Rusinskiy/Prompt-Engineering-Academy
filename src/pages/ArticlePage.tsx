import { Link, useParams } from 'react-router-dom';
import { articles, getArticleBySlug } from '../content/articles';
import { ExerciseRenderer } from '../components/exercises/ExerciseRenderer';
import { NotFoundPage } from './NotFoundPage';

export function ArticlePage() {
  const { slug = '' } = useParams();
  const article = getArticleBySlug(slug);

  if (!article) {
    return <NotFoundPage />;
  }

  return (
    <div className="article-page">
      <section className="article-hero">
        <div>
          <p className="eyebrow">
            {article.eyebrow} • {article.readingTime}
          </p>
          <h1>{article.title}</h1>
          <p className="article-hero__summary">{article.summary}</p>
        </div>
        <aside className="article-nav">
          <p>Все статьи</p>
          <ul>
            {articles.map((entry) => (
              <li key={entry.slug}>
                <Link to={`/articles/${entry.slug}`}>{entry.title}</Link>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="article-content">
        {article.sections.map((section, index) => {
          if (section.kind === 'text') {
            return (
              <section className="article-section" key={`${article.slug}-${index}`}>
                {section.heading ? <h2>{section.heading}</h2> : null}
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            );
          }

          return (
            <div className="article-section article-section--exercise" key={section.exercise.id}>
              <ExerciseRenderer exercise={section.exercise} mode="inline" />
            </div>
          );
        })}
      </section>
    </div>
  );
}
