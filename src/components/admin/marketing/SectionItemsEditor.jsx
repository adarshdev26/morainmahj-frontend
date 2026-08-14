import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

/**
 * Visual editor for the `config.items` array used by cards / timeline /
 * features / benefits / stats / gallery sections.
 * Replaces the old raw-JSON textarea so non-technical admins can edit content.
 */
export default function SectionItemsEditor({ items, onChange }) {
  const list = Array.isArray(items) ? items : [];

  const update = (idx, field, value) => {
    const next = list.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
    onChange(next);
  };

  const add = () => {
    onChange([...list, { title: '', description: '' }]);
  };

  const remove = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium block">Content Items</label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each item becomes a card, timeline step, or feature block on the page.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={add}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {list.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No items yet. Click "Add Item" to get started.</p>
        </div>
      )}

      {list.map((item, idx) => (
        <ItemCard
          key={idx}
          index={idx}
          item={item}
          onUpdate={(field, value) => update(idx, field, value)}
          onRemove={() => remove(idx)}
          onMoveUp={() => move(idx, -1)}
          onMoveDown={() => move(idx, 1)}
          canMoveUp={idx > 0}
          canMoveDown={idx < list.length - 1}
        />
      ))}
    </div>
  );
}

function ItemCard({ index, item, onUpdate, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  const [expanded, setExpanded] = useState(index === 0);

  const title = item.title || item.label || item.name || `(Item ${index + 1})`;

  return (
    <div className="rounded-lg border border-border bg-background/50">
      <div className="flex items-center gap-2 p-2.5">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-medium text-foreground truncate"
        >
          {title}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={!canMoveUp} onClick={onMoveUp}>
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={!canMoveDown} onClick={onMoveDown}>
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Title</label>
              <Input value={item.title || ''} onChange={e => onUpdate('title', e.target.value)} placeholder="Item title" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Icon (Lucide name)</label>
              <Input value={item.icon || ''} onChange={e => onUpdate('icon', e.target.value)} placeholder="Trophy" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Description</label>
            <Textarea value={item.description || ''} onChange={e => onUpdate('description', e.target.value)} rows={2} placeholder="Short description shown under the title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Button Text</label>
              <Input value={item.button_text || ''} onChange={e => onUpdate('button_text', e.target.value)} placeholder="Learn More" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Button URL</label>
              <Input value={item.button_url || ''} onChange={e => onUpdate('button_url', e.target.value)} placeholder="/about" />
            </div>
          </div>
          {(item.image_url !== undefined || item.url !== undefined) && (
            <div>
              <label className="text-xs font-medium mb-1 block">Image URL</label>
              <Input
                value={item.image_url || item.url || ''}
                onChange={e => onUpdate(item.image_url !== undefined ? 'image_url' : 'url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}