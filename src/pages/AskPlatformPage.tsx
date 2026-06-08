import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { askPlatform, type RagAskResponse } from '../lib/rag-api';
import { recordRecentQuery } from '../lib/user-context';

function createPreview(text: string) {
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length <= 220) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, 217)}...`;
}

export function AskPlatformPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<RagAskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedQuery = query.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedQuery || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await askPlatform(normalizedQuery);
      setResult(response);
      recordRecentQuery(response.query);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : String(requestError);
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="ask-page">
      <section className="ask-hero">
        <p className="eyebrow">Локальный RAG</p>
        <h1>Спроси платформу</h1>
        <p className="ask-hero__lead">
          Задай вопрос по материалам академии. Ответ строится на найденных статьях,
          а источники показываются отдельно.
        </p>
      </section>

      <section className="ask-workspace">
        <form className="ask-form" onSubmit={handleSubmit}>
          <label htmlFor="ask-query">Вопрос</label>
          <textarea
            className="input ask-form__textarea"
            id="ask-query"
            placeholder="Например: почему языковая модель может галлюцинировать?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="ask-form__actions">
            <button
              className="button button--primary"
              disabled={!normalizedQuery || isLoading}
              type="submit"
            >
              {isLoading ? 'Ищу ответ...' : 'Задать вопрос'}
            </button>
          </div>

          {isLoading ? (
            <p>Локальная AI-модель готовит ответ. Это может занять некоторое время.</p>
          ) : null}
        </form>

        {error ? <p className="ask-error">{error}</p> : null}

        {result ? (
          <div className="ask-result">
            <section className="ask-answer">
              <p className="eyebrow">Ответ</p>
              <p>{result.answer}</p>
            </section>

            <section className="ask-sources">
              <div className="section-heading">
                <p className="eyebrow">Источники</p>
                <h2>Найденные материалы</h2>
              </div>

              <div className="ask-source-list">
                {result.sources.map((source) => (
                  <article className="ask-source" key={source.id}>
                    <div>
                      <h3>{source.title}</h3>
                      <p className="ask-source__section">{source.sectionTitle}</p>
                    </div>
                    <p>{createPreview(source.text)}</p>
                    <Link className="article-card__link" to={source.url}>
                      Открыть статью
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
