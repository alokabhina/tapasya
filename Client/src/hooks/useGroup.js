import { useState, useEffect, useRef } from 'react'
// ✅ FIX: '@/firebase/groups' → '@/api/groups' (firebase folder exist hi nahi karta)
import {
  createGroup,
  joinGroupByCode,
  leaveGroup,
  subscribeToGroup,
  updateMemberHours,
} from '@/api/groups'
import useUserStore from '@/store/userStore'

export function useGroup() {
  const { uid, displayName, groupId, setGroupId } = useUserStore()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const unsubRef = useRef(null)

  useEffect(() => {
    if (!groupId) {
      setMembers([])
      setGroup(null)
      return
    }
    // subscribeToGroup ab REST polling karta hai (30s interval) — same API
    unsubRef.current = subscribeToGroup(groupId, (updatedMembers) => {
      setMembers(updatedMembers)
    })
    return () => unsubRef.current?.()
  }, [groupId])

  async function handleCreateGroup(name) {
    if (!uid) return
    setLoading(true); setError(null)
    try {
      const { groupId: newId } = await createGroup(uid, displayName, name)
      setGroupId(newId)
    } catch {
      setError('Group create nahi hua. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoinGroup(code) {
    if (!uid) return
    setLoading(true); setError(null)
    try {
      const newId = await joinGroupByCode(uid, displayName, code)
      setGroupId(newId)
    } catch {
      setError('Invalid invite code. Check karke try karo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLeaveGroup() {
    if (!uid || !groupId) return
    setLoading(true)
    try {
      await leaveGroup(uid, groupId)
      setGroupId(null)
      setMembers([])
    } catch {
      setError('Leave nahi hua. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function addSessionHours(seconds) {
    if (!uid || !groupId) return
    await updateMemberHours(uid, groupId, seconds)
  }

  return {
    group, members, loading, error, groupId,
    createGroup: handleCreateGroup,
    joinGroup: handleJoinGroup,
    leaveGroup: handleLeaveGroup,
    addSessionHours,
  }
}
export default useGroup
