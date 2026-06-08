import { ArrowUpCircle, CheckCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

type UpdateBannerProps =
  | {
      latestVersion: string;
      actionLabel: string;
      busy: boolean;
      onAction: () => void;
      onDismiss: () => void;
      variant?: 'available';
    }
  | {
      latestVersion: string;
      onDismiss: () => void;
      variant: 'current';
    };

export function UpdateBanner(props: UpdateBannerProps) {
  const variant = props.variant ?? 'available';
  const isCurrent = variant === 'current';
  const Icon = isCurrent ? CheckCircle : ArrowUpCircle;
  const action = props.variant === 'current' ? null : (
    <Button type="button" size="sm" onClick={props.onAction} disabled={props.busy}>
      {props.busy ? 'Working…' : props.actionLabel}
    </Button>
  );
  const dismissDisabled = props.variant === 'current' ? false : props.busy;

  return (
    <div
      data-testid="update-banner"
      className="flex items-center justify-between gap-3 border-b border-border bg-emerald-500/10 px-3 py-2 text-sm"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="truncate">
          {isCurrent ? (
            <>
              You're already on the latest version{' '}
              <span className="font-semibold">v{props.latestVersion}</span>.
            </>
          ) : (
            <>
              A new version <span className="font-semibold">v{props.latestVersion}</span> is
              available.
            </>
          )}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="Dismiss update notification"
          onClick={props.onDismiss}
          disabled={dismissDisabled}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
