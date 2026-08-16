// src/hooks/useGroup.js
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  createGroup as apiCreateGroup,
  joinGroupByCode as apiJoinGroup,
  leaveGroup as apiLeaveGroup,
  deleteGroup as apiDeleteGroup,
  kickMember as apiKickMember,
  fetchMyGroups,
  fetchGroupMembers,
  updateMemberHours,
} from '@/api/groups'
import useUserStore from '@/store/userStore'

export function useGroup() {
  const { uid } = useUserStore()
  const [groups, setGroups]           = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [members, setMembers]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const pollRef = useRef(null)

  const group = groups.find(g => g._id === activeGroupId) || groups[0] || null

  useEffect(() => {
    if (!uid) { setGroups([]); setActiveGroupId(null); setMembers([]); return }
    loadAllGroups()
  }, [uid])

  useEffect(() => {
    clearInterval(pollRef.current)
    if (!activeGroupId) { setMembers([]); return }
    let active = true
    async function pollMembers() {
      try { const data = await fetchGroupMembers(activeGroupId); if (active) setMembers(data) } catch {}
    }
    pollMembers()
    pollRef.current = setInterval(pollMembers, 20_000) // was 8s — reduced to cut Vercel function invocations
    return () => { active = false; clearInterval(pollRef.current) }
  }, [activeGroupId])

  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) setActiveGroupId(groups[0]._id)
    else if (groups.length === 0) setActiveGroupId(null)
  }, [groups])

  async function loadAllGroups() {
    setLoading(true)
    try { const data = await fetchMyGroups(); setGroups(data) }
    catch (e) { console.error('Groups load error:', e) }
    finally { setLoading(false) }
  }

  async function handleCreateGroup(name) {
    setLoading(true); setError(null)
    try {
      const { group: newGroup } = await apiCreateGroup(name)
      setGroups(prev => [...prev, newGroup])
      setActiveGroupId(newGroup._id)
      return newGroup
    } catch (e) {
      const msg = e?.response?.data?.error || 'Group create nahi hua. Try again.'
      setError(msg); throw new Error(msg)
    } finally { setLoading(false) }
  }

  async function handleJoinGroup(code) {
    setLoading(true); setError(null)
    try {
      const { group: joinedGroup } = await apiJoinGroup(code)
      setGroups(prev => { const exists = prev.find(g => g._id === joinedGroup._id); return exists ? prev : [...prev, joinedGroup] })
      setActiveGroupId(joinedGroup._id)
      return joinedGroup
    } catch (e) {
      const msg = e?.response?.data?.error || 'Invalid invite code.'
      setError(msg); throw new Error(msg)
    } finally { setLoading(false) }
  }

  async function handleLeaveGroup(groupId) {
    const targetId = groupId || activeGroupId
    if (!targetId) return
    setLoading(true)
    try {
      await apiLeaveGroup(targetId)
      clearInterval(pollRef.current)
      const remaining = groups.filter(g => g._id !== targetId)
      setGroups(remaining)
      setActiveGroupId(remaining[0]?._id || null)
      setMembers([])
    } catch (e) {
      const msg = e?.response?.data?.error || 'Leave nahi hua. Try again.'
      setError(msg); throw new Error(msg)
    } finally { setLoading(false) }
  }

  async function handleDeleteGroup(groupId) {
    const targetId = groupId || activeGroupId
    if (!targetId) return
    setLoading(true)
    try {
      await apiDeleteGroup(targetId)
      clearInterval(pollRef.current)
      const remaining = groups.filter(g => g._id !== targetId)
      setGroups(remaining)
      setActiveGroupId(remaining[0]?._id || null)
      setMembers([])
    } catch (e) {
      const msg = e?.response?.data?.error || 'Delete nahi hua. Try again.'
      setError(msg); throw new Error(msg)
    } finally { setLoading(false) }
  }

  async function handleKickMember(groupId, userId) {
    try {
      await apiKickMember(groupId, userId)
      setMembers(prev => prev.filter(m => m.userId?.toString() !== userId))
      setGroups(prev => prev.map(g => g._id === groupId
        ? { ...g, members: g.members.filter(m => m.userId?.toString() !== userId), memberCount: (g.memberCount || 1) - 1 }
        : g
      ))
    } catch (e) {
      const msg = e?.response?.data?.error || 'Kick nahi hua.'
      throw new Error(msg)
    }
  }

  async function addSessionHours(seconds) {
    if (!groups.length) return
    for (const g of groups) {
      try { await updateMemberHours(g._id, seconds) } catch (e) { console.error(`Group hours update failed for ${g._id}:`, e) }
    }
  }

  // Listen for session-saved event from useTimer
  useEffect(() => {
    function onSessionSaved(e) {
      const { seconds } = e.detail || {}
      if (seconds > 0) addSessionHours(seconds)
    }
    window.addEventListener('tapasya:session-saved', onSessionSaved)
    return () => window.removeEventListener('tapasya:session-saved', onSessionSaved)
  }, [groups]) // groups dependency — addSessionHours uses groups internally

  return {
    groups, group, activeGroupId, setActiveGroupId,
    members, loading, error,
    createGroup:  handleCreateGroup,
    joinGroup:    handleJoinGroup,
    leaveGroup:   handleLeaveGroup,
    deleteGroup:  handleDeleteGroup,
    kickMember:   handleKickMember,
    addSessionHours,
    refresh:      loadAllGroups,
  }
}

export default useGroup