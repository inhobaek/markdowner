import { describe, expect, it } from 'vitest';

import { findClickedAnchorHref, isOpenLinkClick } from './linkOpener';

describe('isOpenLinkClick', () => {
  it('treats Cmd+Click as the link-open intent on macOS', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });
    try {
      expect(isOpenLinkClick({ metaKey: true, ctrlKey: false })).toBe(true);
      expect(isOpenLinkClick({ metaKey: false, ctrlKey: true })).toBe(false);
      expect(isOpenLinkClick({ metaKey: false, ctrlKey: false })).toBe(false);
    } finally {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    }
  });

  it('treats Ctrl+Click as the link-open intent on non-macOS', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform');
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Win32',
    });
    try {
      expect(isOpenLinkClick({ metaKey: false, ctrlKey: true })).toBe(true);
      expect(isOpenLinkClick({ metaKey: true, ctrlKey: false })).toBe(false);
      expect(isOpenLinkClick({ metaKey: false, ctrlKey: false })).toBe(false);
    } finally {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform);
      }
    }
  });
});

describe('findClickedAnchorHref', () => {
  it('returns the closest anchor href from nested click targets', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a href="./notes.md"><span>Notes</span></a>';
    const target = container.querySelector('span');

    expect(findClickedAnchorHref(target, container)).toBe('./notes.md');
  });

  it('rejects anchors outside the supplied container', () => {
    const container = document.createElement('div');
    const outside = document.createElement('a');
    outside.href = 'https://example.com';

    expect(findClickedAnchorHref(outside, container)).toBeNull();
  });

  it('returns null when the target has no usable href', () => {
    const container = document.createElement('div');
    container.innerHTML = '<a><span>No href</span></a>';
    const target = container.querySelector('span');

    expect(findClickedAnchorHref(target, container)).toBeNull();
  });
});
