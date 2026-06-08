import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/layout/SiteLayout';
import { ArticlePage } from './pages/ArticlePage';
import { AskPlatformPage } from './pages/AskPlatformPage';
import { HomePage } from './pages/HomePage';
import { JourneyReportPage } from './pages/JourneyReportPage';
import { JourneyRunPage } from './pages/JourneyRunPage';
import { JourneySetupPage } from './pages/JourneySetupPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { QuizPage } from './pages/QuizPage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />} path="/">
        <Route element={<HomePage />} index />
        <Route element={<AskPlatformPage />} path="ask" />
        <Route element={<ArticlePage />} path="articles/:slug" />
        <Route element={<JourneySetupPage />} path="journey" />
        <Route element={<JourneyRunPage />} path="journey/run" />
        <Route element={<JourneyReportPage />} path="journey/report" />
        <Route element={<QuizPage />} path="quiz" />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
