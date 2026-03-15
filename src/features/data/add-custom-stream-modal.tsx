/**
 * Modal to create a new custom data stream: name, link type, optional key column for standalone.
 */

import { useState } from 'react';

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'stream';
}

export interface AddCustomStreamModalProps {
  existingIds: string[];
  onClose: () => void;
  onAdd: (label: string, linkType: 'provider' | 'standalone', keyColumn?: string) => void;
}

export function AddCustomStreamModal({ existingIds, onClose, onAdd }: AddCustomStreamModalProps) {
  const [label, setLabel] = useState('');
  const [linkType, setLinkType] = useState<'provider' | 'standalone'>('provider');
  const [keyColumn, setKeyColumn] = useState('');
  const derivedId = label.trim() ? slugify(label) : '';
  const isDuplicate = Boolean(derivedId && existingIds.includes(derivedId));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || isDuplicate) return;
    onAdd(label.trim(), linkType, linkType === 'standalone' && keyColumn.trim() ? keyColumn.trim() : undefined);
    onClose();
  };
  return (
    <div className="w-full" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-semibold text-slate-800">Add data stream</h3>
      <p className="text-sm text-slate-500 mt-1">
        Create a named stream (e.g. Risk, Quality). Choose whether it links to providers by Employee ID or stands alone with its own key.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="add-stream-label" className="block text-sm font-medium text-slate-700">Stream name</label>
            <input
              id="add-stream-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Risk flags"
              className="mt-1.5 w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {derivedId && (
              <p className="mt-1 text-xs text-slate-500">ID: {derivedId}</p>
            )}
            {isDuplicate && (
              <p className="mt-1 text-xs text-amber-700">A stream with this ID already exists.</p>
            )}
          </div>
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">Link type</span>
            <div className="mt-1.5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="linkType"
                  checked={linkType === 'provider'}
                  onChange={() => setLinkType('provider')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Provider-linked (match by Employee ID)
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="linkType"
                  checked={linkType === 'standalone'}
                  onChange={() => setLinkType('standalone')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                Standalone (one row per key)
              </label>
            </div>
          </div>
        </div>
        {linkType === 'standalone' && (
          <div className="border-t border-slate-100 pt-4">
            <label htmlFor="add-stream-key" className="block text-sm font-medium text-slate-700">Key column name</label>
            <input
              id="add-stream-key"
              type="text"
              value={keyColumn}
              onChange={(e) => setKeyColumn(e.target.value)}
              placeholder="e.g. Region or ID"
              className="mt-1.5 w-full max-w-sm px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-slate-500">Logical name for the column that uniquely identifies each row.</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="app-btn-secondary">Cancel</button>
          <button
            type="submit"
            disabled={!label.trim() || isDuplicate}
            className="app-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add stream
          </button>
        </div>
      </form>
    </div>
  );
}
