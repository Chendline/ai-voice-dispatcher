import { isWorkspacePath, usePathname } from './lib/router';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';

export default function App() {
  const path = usePathname();
  return isWorkspacePath(path) ? <WorkspacePage /> : <LandingPage />;
}
