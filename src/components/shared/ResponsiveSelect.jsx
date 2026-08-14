import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

function useIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 1024;
}

/**
 * ResponsiveSelect — standard Select on desktop, Bottom Sheet Drawer on mobile.
 *
 * Props:
 *   value          — currently selected value
 *   onValueChange  — callback(newValue)
 *   placeholder    — trigger placeholder text
 *   options        — [{ value, label }]
 *   triggerClassName — extra classes for the trigger
 *   title          — drawer header title (optional)
 */
export default function ResponsiveSelect({
  value,
  onValueChange,
  placeholder = 'Select…',
  options = [],
  triggerClassName,
  title,
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedLabel = options.find(o => o.value === value)?.label ?? placeholder;

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: button trigger + drawer bottom sheet
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-foreground',
          !value && 'text-muted-foreground',
          triggerClassName
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg className="ml-2 h-4 w-4 opacity-50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          {title && (
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base">{title}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="px-4 pb-6 space-y-1 max-h-[60vh] overflow-y-auto">
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onValueChange(opt.value); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}