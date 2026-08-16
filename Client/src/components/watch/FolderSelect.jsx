// src/components/watch/FolderSelect.jsx
// Dropdown of the user's own custom watch-folders, with an inline
// "+ New folder" option — completely independent of the app's global
// Subject list.

import { useState } from 'react'
import { createFolder } from '@/api/folders'

export default function FolderSelect({ folders, value, onChange, onFolderCreated, onError }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const folder = await createFolder(newName.trim())
      onFolderCreated?.(folder)
      onChange(folder._id)
      setNewName('')
      setCreating(false)
    } catch {
      const msg = 'Folder banane mein dikkat aayi'
      onError ? onError(msg) : alert(msg)
    } finally {
      setSaving(false)
    }
  }

  if (creating) {
    return (
      <div className="flex gap-1.5">
        <input
          autoFocus
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
            if (e.key === 'Escape') { setCreating(false); setNewName('') }
          }}
          placeholder="Folder ka naam"
          className="flex-1 px-3 py-2.5 rounded-lg bg-slate-800 border border-orange-500/50 text-slate-100 text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving}
          className="px-3 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm"
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => { setCreating(false); setNewName('') }}
          className="px-2.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm"
        >
          <i className="ti ti-x" />
        </button>
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === '__new__') {
          setCreating(true)
        } else {
          onChange(e.target.value)
        }
      }}
      className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-orange-500 cursor-pointer"
    >
      {folders.length === 0 && <option value="">Koi folder nahi hai</option>}
      {folders.map((f) => (
        <option key={f._id} value={f._id}>{f.fromPlaylist ? '▸ ' : ''}{f.name}</option>
      ))}
      <option value="__new__">+ New folder</option>
    </select>
  )
}