import { useState, useEffect } from 'react';

const STORAGE_KEY = 'sts_onboarding_done';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding };
}
