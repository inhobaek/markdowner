import { describe, expect, it } from 'vitest';

import { createDocumentTab, createSettingsTab } from './documentTabs';
import { buildOpenTabsPayload } from './openTabsSession';

describe('buildOpenTabsPayload', () => {
  it('persists only path-backed document tabs and the active document path', () => {
    const savedFirst = createDocumentTab({
      id: 'first',
      path: '/tmp/first.md',
      name: 'first.md',
    });
    const untitled = createDocumentTab({
      id: 'untitled',
      path: null,
      name: 'Untitled',
    });
    const savedSecond = createDocumentTab({
      id: 'second',
      path: '/tmp/second.md',
      name: 'second.md',
    });

    expect(
      buildOpenTabsPayload({
        tabs: [savedFirst, createSettingsTab(), untitled, savedSecond],
        activeTabId: 'second',
        cursorPositions: new Map([
          ['/tmp/first.md', { line: 2, column: 3 }],
          ['/tmp/closed.md', { line: 10, column: 1 }],
          ['/tmp/second.md', { line: 4, column: 5 }],
        ]),
      }),
    ).toEqual({
      openTabs: ['/tmp/first.md', '/tmp/second.md'],
      activeTabPath: '/tmp/second.md',
      cursorPositions: {
        '/tmp/first.md': { line: 2, column: 3 },
        '/tmp/second.md': { line: 4, column: 5 },
      },
    });
  });

  it('uses a null active path when the active tab is not a persisted document', () => {
    const saved = createDocumentTab({
      id: 'saved',
      path: '/tmp/saved.md',
      name: 'saved.md',
    });

    expect(
      buildOpenTabsPayload({
        tabs: [saved, createSettingsTab()],
        activeTabId: '__markdowner_settings__',
        cursorPositions: new Map([['/tmp/saved.md', { line: 1, column: 1 }]]),
      }),
    ).toEqual({
      openTabs: ['/tmp/saved.md'],
      activeTabPath: null,
      cursorPositions: {
        '/tmp/saved.md': { line: 1, column: 1 },
      },
    });
  });
});
