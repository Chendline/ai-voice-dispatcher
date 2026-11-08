import { useEffect, useState } from 'react';

const NAVIGATE_EVENT = 'aegis:navigate';

export function currentPath(): string {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const next = to.startsWith('/') ? to : `/${to}`;
  if (currentPath() === next.replace(/\/+$/, '')) return;
  if (options.replace) window.history.replaceState({}, '', next);
  else window.history.pushState({}, '', next);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export function usePathname(): string {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const sync = () => setPath(currentPath());
    window.addEventListener('popstate', sync);
    window.addEventListener(NAVIGATE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(NAVIGATE_EVENT, sync);
    };
  }, []);

  return path;
}

export function isWorkspacePath(path: string): boolean {
  return path === '/app' || path.startsWith('/app/');
}

export type WorkspaceSection = 'chat' | 'voice' | 'dispatch' | 'agents' | 'settings';

export function sectionFromPath(path: string): WorkspaceSection {
  const section = path.replace(/^\/app\/?/, '').split('/')[0];
  if (section === 'voice' || section === 'dispatch' || section === 'agents' || section === 'settings') {
    return section;
  }
  return 'chat';
}

export function pathForSection(section: WorkspaceSection): string {
  return section === 'chat' ? '/app' : `/app/${section}`;
}
