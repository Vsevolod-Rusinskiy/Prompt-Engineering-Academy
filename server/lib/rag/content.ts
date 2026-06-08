import { articles } from '../../../src/content/articles';
import type { RagChunk } from './types';

function normalizeParagraphs(paragraphs: string[]) {
  return paragraphs
    .map((paragraph) => String(paragraph).trim())
    .filter((paragraph) => paragraph.length > 0);
}

export function buildArticleChunks(): RagChunk[] {
  return articles.flatMap((article) =>
    article.sections.flatMap((section, sectionIndex) => {
      const sectionNumber = sectionIndex + 1;

      if (section.kind !== 'text') {
        return [];
      }

      const normalizedParagraphs = normalizeParagraphs(section.paragraphs);

      if (normalizedParagraphs.length === 0) {
        return [];
      }

      const sectionTitle =
        section.heading?.trim() || `Раздел ${sectionNumber}`;
      const textParts = [sectionTitle, ...normalizedParagraphs];
      const text = textParts.join('\n\n').trim();

      if (!text) {
        return [];
      }

      return [
        {
          id: `article:${article.slug}:section-${sectionNumber}`,
          sourceType: 'article',
          sourceId: article.slug,
          title: article.title,
          sectionTitle,
          text,
          url: `/articles/${article.slug}`,
        },
      ];
    }),
  );
}
