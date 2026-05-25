import { useMemo } from 'react';
import { parseTestMode, type TestModeConfig } from '../lib/testMode';

export function useTestMode(): TestModeConfig {
  return useMemo(() => parseTestMode(), []);
}
