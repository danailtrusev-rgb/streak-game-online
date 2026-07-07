import { useEffect } from 'react';

interface DocumentMetaOptions {
  title: string;
  description?: string;
  /** e.g. 'noindex, nofollow, noarchive'. Omit to leave robots untouched (indexable). */
  robots?: string;
}

function setMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function removeMetaTag(name: string) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
}

/** Sets document title + meta description/robots on mount, restores defaults on unmount. */
export function useDocumentMeta({ title, description, robots }: DocumentMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    if (description) setMetaTag('description', description);
    if (robots) setMetaTag('robots', robots);

    return () => {
      document.title = prevTitle;
      if (robots) removeMetaTag('robots');
    };
  }, [title, description, robots]);
}
