'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Props = { name: string; currentPhoto: string; currentBio: string };

export default function ProfileEditForm({ name, currentPhoto, currentBio }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentPhoto);
  const [bio, setBio] = useState(currentBio);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhoto);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', name);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setPhotoUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, bio }),
      });
      if (!res.ok) throw new Error('Save failed');
      router.push(`/players/${encodeURIComponent(name)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Photo */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Profile Photo
        </label>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-lime-500/20 border-2 border-lime-500/40 hover:border-lime-400 transition-colors flex items-center justify-center group"
          >
            {preview ? (
              <Image src={preview} alt={name} fill className="object-cover" unoptimized />
            ) : (
              <Image src="/logo.png" alt="Player" fill className="object-cover" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-semibold">Change</span>
            </div>
          </button>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Choose Photo'}
            </button>
            <p className="text-xs text-slate-500 mt-1.5">JPG, PNG, HEIC — tap to use camera on mobile</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Bio <span className="text-slate-600 normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Add a short bio…"
          rows={3}
          maxLength={200}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500/30 resize-none"
        />
        <p className="text-xs text-slate-600 text-right mt-0.5">{bio.length}/200</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex-1 py-3 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
