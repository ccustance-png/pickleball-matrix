'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  id?: string;
};

export default function PlayerCombobox({ value, onChange, suggestions, placeholder, id }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder ?? 'Player name'}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30 uppercase"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {filtered.slice(0, 8).map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => { onChange(s); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 uppercase"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
