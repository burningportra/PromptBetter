import React, { useCallback, useEffect, useState } from 'react'
import type { TmuxSession } from '../../shared/types'

interface TmuxDropdownProps {
  value: string
  onChange: (sessionName: string) => void
  disabled?: boolean
}

export function TmuxDropdown({
  value,
  onChange,
  disabled,
}: TmuxDropdownProps): React.ReactElement {
  const [sessions, setSessions] = useState<TmuxSession[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.electronAPI.listTmuxSessions()
      setSessions(list)
      // Auto-select when exactly one Claude Code session exists
      const claudeSessions = list.filter((s) => s.isClaudeCode)
      if (claudeSessions.length === 1 && !value) {
        onChange(claudeSessions[0].name)
      }
    } catch (err) {
      console.error('[TmuxDropdown] Failed to list sessions:', err)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [value, onChange])

  // Load sessions on mount
  useEffect(() => {
    fetchSessions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || sessions.length === 0}
        aria-label="tmux session"
        className="
          flex-1 min-w-0 bg-gray-700 border border-gray-600 text-gray-100 text-xs rounded-md
          px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
        "
        style={{ touchAction: 'manipulation' }}
      >
        {sessions.length === 0 ? (
          <option value="">No sessions</option>
        ) : (
          sessions.map((session) => (
            <option key={session.name} value={session.name}>
              {session.isClaudeCode ? `⚡ ${session.name}` : session.name}
            </option>
          ))
        )}
      </select>

      <button
        type="button"
        onClick={fetchSessions}
        disabled={loading}
        aria-label="Refresh sessions"
        title="Refresh sessions"
        className="
          flex-none p-1.5 rounded-md bg-gray-700 border border-gray-600
          text-gray-400 hover:text-gray-100 hover:bg-gray-600
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center
        "
        style={{ touchAction: 'manipulation' }}
      >
        <span className={loading ? 'animate-spin inline-block' : ''} aria-hidden>
          🔄
        </span>
      </button>
    </div>
  )
}
