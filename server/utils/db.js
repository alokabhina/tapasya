// utils/db.js
// Cached MongoDB connection for Vercel serverless — critical fix.
//
// PROBLEM: mongoose.connect() called once at module load works fine on a
// normal always-on server, but on Vercel every serverless invocation can
// spin up a fresh function instance. Without caching, each one opens a new
// Mongo connection that never closes, which exhausts the Atlas M0 free-tier
// connection limit ("nearing the maximum connections" alert).
//
// FIX: reuse a single connection (and in-flight connect promise) across
// invocations of the same warm function instance via `global`.

import mongoose from 'mongoose'

let cached = global._mongoose
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        maxPoolSize: 5,        // keep pool small — M0 free tier has a low connection ceiling
        bufferCommands: false, // fail fast instead of silently queuing ops on a dead connection
      })
      .then((m) => {
        console.log('✅ MongoDB connected')
        return m
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null // allow retry on next request instead of staying stuck
    throw e
  }

  return cached.conn
}
