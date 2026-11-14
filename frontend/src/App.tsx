import { CookieNotice } from './components/CookieNotice';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isCookiesPath, isPrivacyPath, isTermsPath, isWorkspacePath, usePathname } from './lib/router';
import { CookiesPage } from './pages/CookiesPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { WorkspacePage } from './pages/WorkspacePage';

export default function App() {
  const path = usePathname();

  let pageContent;
  if (isWorkspacePath(path)) pageContent = <WorkspacePage />;
  else if (isTermsPath(path)) pageContent = <TermsPage />;
  else if (isPrivacyPath(path)) pageContent = <PrivacyPage />;
  else if (isCookiesPath(path)) pageContent = <CookiesPage />;
  else pageContent = <LandingPage />;

  return (
    <ErrorBoundary>
      {pageContent}
      <CookieNotice />
    </ErrorBoundary>
  );
}
