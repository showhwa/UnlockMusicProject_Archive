import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettingsSectionId } from '@/settings/labels';

export type UseSectionScrollSpyOptions = {
  sectionIds: readonly SettingsSectionId[];
  defaultId: SettingsSectionId;
};

export function useSectionScrollSpy({ sectionIds, defaultId }: UseSectionScrollSpyOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<SettingsSectionId>(defaultId);
  const suppressUntilRef = useRef(0);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const elements = sectionIds
      .map((id) => root.querySelector<HTMLElement>(`#${id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressUntilRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target.id) return;
        const id = top.target.id as SettingsSectionId;
        if (sectionIds.includes(id)) {
          setActiveId(id);
        }
      },
      {
        root,
        rootMargin: '-10% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionIds]);

  const scrollTo = useCallback((id: SettingsSectionId) => {
    const root = scrollRef.current;
    const target = root?.querySelector<HTMLElement>(`#${id}`);
    if (!target) return;
    setActiveId(id);
    suppressUntilRef.current = Date.now() + 600;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return { scrollRef, activeId, scrollTo };
}
