import { cn } from '@/lib/utils';
import { UserStatus } from '@/types';

interface StatusIndicatorProps {
  status: UserStatus;
  size?: 'sm' | 'md' | 'lg';
  showRing?: boolean;
  className?: string;
}

export function StatusIndicator({ status, size = 'md', showRing = false, className }: StatusIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const statusClasses = {
    online: 'status-online',
    idle: 'status-idle',
    offline: 'status-offline',
  };

  return (
    <span
      className={cn(
        'relative inline-block rounded-full',
        sizeClasses[size],
        statusClasses[status],
        className
      )}
    >
      {showRing && status === 'online' && (
        <span
          className={cn(
            'absolute inset-0 rounded-full status-online animate-pulse-ring',
            sizeClasses[size]
          )}
        />
      )}
    </span>
  );
}
