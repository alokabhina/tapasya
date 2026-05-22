// src/hooks/useAuth.js
// FIX: user object mein displayName expose karo (Settings mein "Guest" aa raha tha)
// FIX: register/login pe naam liya jaata hai — ab setUser mein displayName save hota hai
// FIX: offline mein /auth/me fail hone par logout mat karo — persisted uid use karo

import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import useUserStore from '@/store/userStore'

// localStorage se persisted uid padhna — userStore rehydrate hone se pehle bhi kaam karta hai
function getPersistedUid() {
  try {
    const raw = localStorage.getItem('tapasya_user')
    return raw ? JSON.parse(raw)?.state?.uid : null
  } catch { return null }
}

export function useAuth() {
  const { uid, displayName, email, setUser, clearUser } = useUserStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tapasya_token')
    if (!token) { setLoading(false); return }

    api.get('/auth/me')
      .then(r => {
        setUser({
          uid: r.data._id,
          displayName: r.data.displayName,
          email: r.data.email,
          photoURL: r.data.photoURL,
          isGuest: r.data.isGuest,
        })
        setLoading(false)
      })
      .catch(() => {
        // Offline ya server temporarily down ho sakta hai.
        // Agar offline hai aur persisted uid hai to user ko logged-in rakho.
        // Zustand persist middleware uid/displayName already store mein load kar chuka hoga.
        // Sirf online mein /auth/me fail aaye tab token hatao.
        if (!navigator.onLine && getPersistedUid()) {
          // Offline mode — cached state se kaam chalao
          setLoading(false)
        } else {
          // Online pe /auth/me fail = token expired/invalid -> force logout
          localStorage.removeItem('tapasya_token')
          clearUser()
          setLoading(false)
        }
      })
  }, [])

  const handleGoogleCredential = useCallback(async (credential) => {
    const { data } = await api.post('/auth/google', { credential })
    localStorage.setItem('tapasya_token', data.token)
    setUser({
      uid: data.user.id,
      displayName: data.user.displayName,
      email: data.user.email,
      photoURL: data.user.photoURL,
      isGuest: false,
    })
  }, [setUser])

  async function signInWithEmail(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('tapasya_token', data.token)
    setUser({
      uid: data.user.id,
      displayName: data.user.displayName,
      email: data.user.email,
      photoURL: data.user.photoURL,
      isGuest: false,
    })
  }

  async function register(email, password, name) {
    const { data } = await api.post('/auth/register', { email, password, displayName: name })
    localStorage.setItem('tapasya_token', data.token)
    setUser({
      uid: data.user.id,
      displayName: data.user.displayName,
      email: data.user.email,
      isGuest: false,
    })
  }

  async function signInAsGuest() {
    const { data } = await api.post('/auth/guest')
    localStorage.setItem('tapasya_token', data.token)
    setUser({
      uid: data.user.id,
      displayName: data.user.displayName || 'Guest',
      isGuest: true,
    })
  }

  async function signOut() {
    localStorage.removeItem('tapasya_token')
    clearUser()
  }

  return {
    user: uid ? { uid, displayName, email } : null,
    loading,
    handleGoogleCredential,
    signInWithEmail,
    register,
    signInAsGuest,
    signOut,
  }
}

export default useAuth