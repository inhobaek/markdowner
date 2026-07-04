import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceTree } from './WorkspaceTree';
import type { WorkspaceTreeNode } from '@/lib/workspaceTree';

const tree: WorkspaceTreeNode[] = [
  {
    kind: 'folder',
    key: 'guides',
    name: 'guides',
    children: [
      {
        kind: 'file',
        key: '/tmp/project/guides/draft.md',
        path: '/tmp/project/guides/draft.md',
        name: 'draft.md',
        relativePath: 'guides/draft.md',
      },
    ],
  },
  {
    kind: 'file',
    key: '/tmp/project/README.md',
    path: '/tmp/project/README.md',
    name: 'README.md',
    relativePath: 'README.md',
  },
];

describe('WorkspaceTree', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders folders and files with active file highlighting', () => {
    render(
      <WorkspaceTree
        nodes={tree}
        activePath="/tmp/project/README.md"
        collapsedKeys={[]}
        filtering={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRenameFile={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /guides/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /draft\.md/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /README\.md/i })).toHaveClass(
      'bg-accent',
    );
  });

  it('hides collapsed folder children unless filtering is active', () => {
    const { rerender } = render(
      <WorkspaceTree
        nodes={tree}
        activePath={null}
        collapsedKeys={['guides']}
        filtering={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRenameFile={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /guides/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('button', { name: /draft\.md/i })).not.toBeInTheDocument();

    rerender(
      <WorkspaceTree
        nodes={tree}
        activePath={null}
        collapsedKeys={['guides']}
        filtering={true}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRenameFile={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /guides/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /draft\.md/i })).toBeInTheDocument();
  });

  it('routes folder toggles and file opens', () => {
    const onToggleFolder = vi.fn();
    const onOpenFile = vi.fn();

    render(
      <WorkspaceTree
        nodes={tree}
        activePath={null}
        collapsedKeys={[]}
        filtering={false}
        onToggleFolder={onToggleFolder}
        onOpenFile={onOpenFile}
        onRenameFile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /guides/i }));
    fireEvent.click(screen.getByRole('button', { name: /draft\.md/i }));

    expect(onToggleFolder).toHaveBeenCalledWith('guides');
    expect(onOpenFile).toHaveBeenCalledWith('/tmp/project/guides/draft.md');
    expect(
      within(screen.getByRole('button', { name: /draft\.md/i })).getByText(
        'guides/draft.md',
      ),
    ).toHaveClass('sr-only');
  });

  it('renames a file from the right-click context menu', async () => {
    const onOpenFile = vi.fn();
    const onRenameFile = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceTree
        nodes={tree}
        activePath={null}
        collapsedKeys={[]}
        filtering={false}
        onToggleFolder={vi.fn()}
        onOpenFile={onOpenFile}
        onRenameFile={onRenameFile}
      />,
    );

    const file = screen.getByRole('button', { name: /draft\.md/i });
    fireEvent.contextMenu(file, { clientX: 12, clientY: 24 });

    expect(onOpenFile).not.toHaveBeenCalled();
    const menu = screen.getByRole('menu', { name: /file actions for draft\.md/i });
    fireEvent.click(within(menu).getByRole('menuitem', { name: /rename/i }));

    const input = screen.getByRole('textbox', { name: /rename draft\.md/i });
    expect(input).toHaveValue('draft');
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRenameFile).toHaveBeenCalledWith('/tmp/project/guides/draft.md', 'renamed');
  });

  it('opens the file context menu from a secondary-button mouse down', () => {
    render(
      <WorkspaceTree
        nodes={tree}
        activePath={null}
        collapsedKeys={[]}
        filtering={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRenameFile={vi.fn()}
      />,
    );

    fireEvent.mouseDown(screen.getByRole('button', { name: /draft\.md/i }), {
      button: 2,
      clientX: 12,
      clientY: 24,
    });

    expect(screen.getByRole('menu', { name: /file actions for draft\.md/i })).toBeInTheDocument();
  });

  it('clears browser text selection when opening the file context menu', () => {
    const removeAllRanges = vi.fn();
    const getSelection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ removeAllRanges } as unknown as Selection);

    render(
      <WorkspaceTree
        nodes={tree}
        activePath={null}
        collapsedKeys={[]}
        filtering={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRenameFile={vi.fn()}
      />,
    );

    fireEvent.contextMenu(screen.getByRole('button', { name: /draft\.md/i }));

    expect(removeAllRanges).toHaveBeenCalled();
    getSelection.mockRestore();
  });

  it('does not start rename from Enter on the file row', () => {
    render(
      <WorkspaceTree
        nodes={tree}
        activePath={null}
        collapsedKeys={[]}
        filtering={false}
        onToggleFolder={vi.fn()}
        onOpenFile={vi.fn()}
        onRenameFile={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: /draft\.md/i }), { key: 'Enter' });

    expect(screen.queryByRole('textbox', { name: /rename draft\.md/i })).not.toBeInTheDocument();
  });
});
