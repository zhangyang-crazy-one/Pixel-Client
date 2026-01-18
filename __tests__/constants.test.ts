import { describe, it, expect } from 'vitest';
import { Theme } from '../types';
import { THEME_STYLES, TRANSLATIONS, API_BASE_URL, API_KEY, INITIAL_PROVIDERS, INITIAL_MODELS, PROVIDER_LOGOS, getProviderIcon } from '../constants';

// Constants validation tests
describe('API Configuration', () => {
  it('should have API base URL defined', () => {
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL).toContain('http');
  });

  it('should have fallback API key defined', () => {
    expect(typeof API_KEY).toBe('string');
    // API_KEY might be empty string in test environment
  });

  it('should have initial providers array', () => {
    expect(Array.isArray(INITIAL_PROVIDERS)).toBe(true);
  });

  it('should have initial models array', () => {
    expect(Array.isArray(INITIAL_MODELS)).toBe(true);
  });
});

// Provider logo tests
describe('Provider Logos', () => {
  it('should have logos for major providers', () => {
    const providers = ['openai', 'anthropic', 'google', 'deepseek', 'qwen', 'zhipu', 'custom'];
    providers.forEach(provider => {
      expect(PROVIDER_LOGOS).toHaveProperty(provider);
    });
  });

  it('should return valid React nodes for logos', () => {
    Object.values(PROVIDER_LOGOS).forEach(logo => {
      expect(logo).toBeDefined();
      expect(typeof logo).toBe('object');
    });
  });

  it('should get correct icon for provider type', () => {
    expect(getProviderIcon('openai')).toBe(PROVIDER_LOGOS.openai);
    expect(getProviderIcon('anthropic')).toBe(PROVIDER_LOGOS.anthropic);
    expect(getProviderIcon('google')).toBe(PROVIDER_LOGOS.google);
    expect(getProviderIcon('gemini')).toBe(PROVIDER_LOGOS.google);
    expect(getProviderIcon('deepseek')).toBe(PROVIDER_LOGOS.deepseek);
  });

  it('should return custom icon for unknown providers', () => {
    expect(getProviderIcon('unknown-provider')).toBe(PROVIDER_LOGOS.custom);
    expect(getProviderIcon('random-model')).toBe(PROVIDER_LOGOS.custom);
  });
});
