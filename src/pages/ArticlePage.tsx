import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { articles, getArticleBySlug } from '../content/articles';
import { ExerciseRenderer } from '../components/exercises/ExerciseRenderer';
import { explainSimply } from '../lib/rag-api';
import { NotFoundPage } from './NotFoundPage';

export function ArticlePage() {
  const { slug = '' } = useParams();
  const article = getArticleBySlug(slug);
  const [loadingSectionKey, setLoadingSectionKey] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explanationErrors, setExplanationErrors] = useState<Record<string, string>>({});

  if (!article) {
    return <NotFoundPage />;
  }

  async function handleExplain(sectionKey: string, text: string, title: string) {
    if (loadingSectionKey) {
      return;
    }

    setLoadingSectionKey(sectionKey);
    setExplanationErrors((current) => {
      const next = { ...current };
      delete next[sectionKey];
      return next;
    });

    try {
      const result = await explainSimply(text, title);
      setExplanations((current) => ({
        ...current,
        [sectionKey]: result.explanation,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setExplanationErrors((current) => ({
        ...current,
        [sectionKey]: message,
      }));
    } finally {
      setLoadingSectionKey(null);
    }
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
            const sectionKey = `${article.slug}-${index}`;
            const sectionTitle = section.heading || article.title;
            const sectionText = [
              section.heading,
              ...section.paragraphs,
            ].filter(Boolean).join('\n\n');
            const isLoading = loadingSectionKey === sectionKey;

            return (
              <section className="article-section" key={sectionKey}>
                {section.heading ? <h2>{section.heading}</h2> : null}
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <button
                  className="button button--ghost"
                  disabled={Boolean(loadingSectionKey)}
                  onClick={() => handleExplain(sectionKey, sectionText, sectionTitle)}
                  type="button"
                >
                  Объяснить проще
                </button>
                {isLoading ? (
                  <p>Локальная AI-модель готовит упрощённое объяснение. Это может занять некоторое время.</p>
                ) : null}
                {explanationErrors[sectionKey] ? (
                  <p className="journey-error">{explanationErrors[sectionKey]}</p>
                ) : null}
                {explanations[sectionKey] ? (
                  <div className="exercise-card__feedback">
                    <p>{explanations[sectionKey]}</p>
                  </div>
                ) : null}
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
