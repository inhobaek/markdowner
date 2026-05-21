function displayDocumentName(name: string | null | undefined): string {
  return name ?? 'Untitled.md';
}

export function formatExternalChangeDetected(name: string | null | undefined): string {
  return `Could not save '${displayDocumentName(name)}' because it changed on disk.`;
}

export function formatExternalChangeVerificationError(
  name: string | null | undefined,
  reason: string,
): string {
  return `Could not verify external changes for '${displayDocumentName(name)}': ${reason}`;
}

export function formatDiskReadError(
  name: string | null | undefined,
  reason: string,
): string {
  return `Could not read disk version of '${displayDocumentName(name)}': ${reason}`;
}
