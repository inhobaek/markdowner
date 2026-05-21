import { describe, expect, it } from 'vitest';

import {
  formatDiskReadError,
  formatExternalChangeDetected,
  formatExternalChangeVerificationError,
} from './externalChanges';

describe('external change messages', () => {
  it('formats the save-blocking changed-on-disk message', () => {
    expect(formatExternalChangeDetected('meeting-notes.md')).toBe(
      "Could not save 'meeting-notes.md' because it changed on disk.",
    );
  });

  it('formats verification and disk-read failures with the provided reason', () => {
    expect(formatExternalChangeVerificationError('meeting-notes.md', 'permission denied')).toBe(
      "Could not verify external changes for 'meeting-notes.md': permission denied",
    );
    expect(formatDiskReadError('meeting-notes.md', 'file missing')).toBe(
      "Could not read disk version of 'meeting-notes.md': file missing",
    );
  });

  it('uses Untitled.md when there is no active document name', () => {
    expect(formatExternalChangeDetected(null)).toBe(
      "Could not save 'Untitled.md' because it changed on disk.",
    );
    expect(formatExternalChangeVerificationError(undefined, 'failed')).toBe(
      "Could not verify external changes for 'Untitled.md': failed",
    );
    expect(formatDiskReadError(null, 'failed')).toBe(
      "Could not read disk version of 'Untitled.md': failed",
    );
  });
});
