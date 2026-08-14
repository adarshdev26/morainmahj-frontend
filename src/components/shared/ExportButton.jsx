import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Lock } from 'lucide-react';
import { useExportPermission } from '@/hooks/useExportPermission';

/**
 * Export button that's only visible to admins
 * Shows a locked state for non-admins with hover tooltip
 */
export default function ExportButton({ 
  onClick, 
  label = 'Export', 
  variant = 'outline',
  disabled = false,
  className = '',
  ...props 
}) {
  const { canExport, isDenied } = useExportPermission();

  if (isDenied) {
    return (
      <Button
        variant={variant}
        disabled
        title="Only admins can export data"
        className={`gap-2 ${className}`}
        {...props}
      >
        <Lock className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  if (!canExport) {
    return null;
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      className={`gap-2 ${className}`}
      {...props}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}