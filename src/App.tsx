import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/layout/SiteLayout';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { QuizPage } from './pages/QuizPage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />} path="/">
        <Route element={<HomePage />} index />
        <Route element={<ArticlePage />} path="articles/:slug" />
        <Route element={<QuizPage />} path="quiz" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
