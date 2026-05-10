// src/hooks/useAuth.js
// FIX: user object mein displayName expose karo (Settings mein "Guest" aa raha tha)
// FIX: register/login pe naam liya jaata hai — ab setUser mein displayName save hota hai

import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import useUserStore from '@/store/userStore'

export function useAuth() {
  const { uid, displayName, setUser, clearUser } = useUserStore()
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
        localStorage.removeItem('tapasya_token')
        clearUser()
        setLoading(false)
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
    // FIX: user object mein displayName expose karo — Settings/Sidebar use karte hain
    user: uid ? { uid, displayName, email: useUserStore.getState().email } : null,
    loading,
    handleGoogleCredential,
    signInWithEmail,
    register,
    signInAsGuest,
    signOut,
  }
}

export default useAuth
