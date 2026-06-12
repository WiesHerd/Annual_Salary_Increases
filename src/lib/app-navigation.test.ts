import { describe, it, expect } from 'vitest';
import {
  buildAppUrl,
  getViewLabel,
  navigateAppLocation,
  parseAppLocation,
} from './app-navigation';

describe('app-navigation', () => {
  it('parses view from hash and controls query params', () => {
    const loc = parseAppLocation('http://local/?tab=merit&focus=equity#parameters');
    expect(loc.view).toBe('parameters');
    expect(loc.controlsTab).toBe('merit');
    expect(loc.focus).toBe('equity');
  });

  it('parses data browser tab from query', () => {
    const loc = parseAppLocation('http://local/?dataTab=market#data-browser');
    expect(loc.view).toBe('data-browser');
    expect(loc.dataTab).toBe('market');
  });

  it('builds url with view-specific params only', () => {
    const url = buildAppUrl(
      { view: 'data-browser', dataTab: 'evaluation' },
      'http://local/?tab=merit&focus=x#parameters'
    );
    expect(url).toBe('/?dataTab=evaluation#data-browser');
  });

  it('push navigation sets return label when returnToCurrent', () => {
    const history: { url: string; state: unknown }[] = [
      { url: 'http://local/#salary-review', state: null },
    ];
    let index = 0;
    const win = {
      location: { href: history[index].url },
      history: {
        get state() {
          return history[index].state;
        },
        pushState(state: unknown, _title: string, url: string) {
          history.splice(index + 1);
          history.push({ url, state });
          index = history.length - 1;
          win.location.href = url;
        },
        replaceState(state: unknown, _title: string, url: string) {
          history[index] = { url, state };
          win.location.href = url;
        },
      },
    };

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', { value: win, configurable: true });

    try {
      navigateAppLocation(
        { view: 'parameters', controlsTab: 'experience-bands', focus: 'equity' },
        { returnToCurrent: true },
        'http://local/#salary-review'
      );
      expect(history[index].state).toEqual({ returnLabel: 'Merit review' });
      expect(history[index].url).toContain('#parameters');
      expect(history[index].url).toContain('tab=experience-bands');
    } finally {
      Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    }
  });

  it('labels data browser with active tab', () => {
    expect(getViewLabel('data-browser', { dataTab: 'market' })).toBe('Data browser · Market survey');
  });
});
