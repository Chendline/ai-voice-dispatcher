import { isPrivacyPath, isTermsPath, isWorkspacePath, usePathname } from './lib/router';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { WorkspacePage } from './pages/WorkspacePage';

export default function App() {
  const path = usePathname();
  if (isWorkspacePath(path)) return <WorkspacePage />;
  if (isTermsPath(path)) return <TermsPage />;
  if (isPrivacyPath(path)) return <PrivacyPage />;
  return <LandingPage />;
}
