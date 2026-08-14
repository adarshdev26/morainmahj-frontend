import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function TournamentSelector({ tournaments, selectedId, onSelect }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!tournaments || tournaments.length === 0) {
    return <p className="text-sm text-muted-foreground">No tournaments created yet.</p>;
  }

  const selected = tournaments.find(t => t.id === selectedId);

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-card text-sm min-h-[44px] w-64 text-left"
        >
          <span className="flex-1 truncate text-foreground">
            {selected?.name || 'Select a tournament'}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select Tournament</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-1 max-h-[60vh] overflow-y-auto">
              {tournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelect(t.id); setDrawerOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm text-left hover:bg-muted transition-colors min-h-[44px]"
                >
                  <span className="font-medium">{t.name}</span>
                  {t.id === selectedId && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
            <div className="px-4 pb-safe-bottom pb-4">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Cancel</Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Select value={selectedId || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-64 bg-card">
        <SelectValue placeholder="Select a tournament" />
      </SelectTrigger>
      <SelectContent>
        {tournaments.map((t) => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}