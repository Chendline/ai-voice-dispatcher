import { isCookiesPath, isPrivacyPath, isTermsPath, isWorkspacePath, usePathname } from './lib/router';
import { CookiesPage } from './pages/CookiesPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { WorkspacePage } from './pages/WorkspacePage';

export default function App() {
  const path = usePathname();
  if (isWorkspacePath(path)) return <WorkspacePage />;
  if (isTermsPath(path)) return <TermsPage />;
  if (isPrivacyPath(path)) return <PrivacyPage />;
  if (isCookiesPath(path)) return <CookiesPage />;
  return <LandingPage />;
}
