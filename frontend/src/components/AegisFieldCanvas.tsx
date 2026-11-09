import { useEffect, useRef } from 'react';
import type { GravityFieldHandle } from '../lib/gravityField';

/**
 * Persistent full-page gravity field.
 *
 * One fixed WebGL canvas sits above the page backgrounds and below the
 * content. It stays mounted for the whole landing page, so the sphere field
 * follows the reader from the hero to the footer instead of restarting in
 * every section.
 *
 * Three.js is loaded on demand so the workspace bundle stays unchanged.
 */
export function AegisFieldCanvas() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let handle: GravityFieldHandle | null = null;
    let disposed = false;
    let token = 0;

    const boot = async () => {
      const current = ++token;
      handle?.destroy();
      handle = null;

      try {
        const { createGravityField } = await import('../lib/gravityField');
        if (disposed || current !== token) return;
        handle = createGravityField(wrapper, { reducedMotion: motionQuery.matches });
        wrapper.dataset.engine = handle ? 'webgl' : 'css';
      } catch {
        if (!disposed && current === token) wrapper.dataset.engine = 'css';
      }
    };

    void boot();

    const handleMotionChange = () => {
      void boot();
    };
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      disposed = true;
      token += 1;
      motionQuery.removeEventListener('change', handleMotionChange);
      handle?.destroy();
      handle = null;
      delete wrapper.dataset.engine;
    };
  }, []);

  return (
    <div className="aegis-field-wrapper" ref={wrapperRef} aria-hidden="true">
      <div className="aegis-field-fallback">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
