import { useState } from 'react';
import { Link } from 'react-router-dom';
import { recommendNext, type RagSource } from '../../lib/rag-api';
import { loadUserContext } from '../../lib/user-context';

export function NextStudyRecommendation() {
  const [recommendation, setRecommendation] = useState('');
  const [sources, setSources] = useState<RagSource[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleRecommend() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const context = loadUserContext();
      const result = await recommendNext({
        weakTopics: context.weakTopics,
        strongTopics: context.strongTopics,
        recentQueries: context.recentQueries,
      });

      setRecommendation(result.recommendation);
      setSources(result.sources);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : String(requestError);
      setError(message);
      setRecommendation('');
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="summary-card">
      <p className="eyebrow">Следующий шаг</p>
      <button
        className="button button--ghost"
        disabled={isLoading}
        onClick={handleRecommend}
        type="button"
      >
        Что изучить дальше?
      </button>
      {isLoading ? (
        <p>Локальная AI-модель анализирует прогресс. Это может занять некоторое время.</p>
      ) : null}
      {error ? <p className="journey-error">{error}</p> : null}
      {recommendation ? <p>{recommendation}</p> : null}
      {sources.length > 0 ? (
        <div className="article-cards">
          {sources.map((source) => (
            <article className="article-card" key={source.id}>
              <h3>{source.title}</h3>
              <p>{source.sectionTitle}</p>
              <Link className="article-card__link" to={source.url}>
                Открыть статью
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
