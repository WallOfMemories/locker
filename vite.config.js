/* global process */
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Settings a deployed site cannot work without. A production build stops
// here with a clear message instead of shipping a site that talks to
// "localhost" or has no Firebase keys.
const REQUIRED = [
  'VITE_API_BASE_URL',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

function checkProductionEnv(env) {
  const missing = REQUIRED.filter((name) => !env[name])

  if (missing.length > 0) {
    throw new Error(
      `Cannot build for production: missing ${missing.join(', ')}.\n` +
        'Set them in the frontend .env (local build) or in your host\'s ' +
        'environment settings (see .env.example).'
    )
  }

  let api
  try {
    api = new URL(env.VITE_API_BASE_URL)
  } catch {
    throw new Error('VITE_API_BASE_URL is not a valid URL (example: https://api.example.com).')
  }

  const isLocal = ['localhost', '127.0.0.1'].includes(api.hostname)

  if (api.protocol !== 'https:' && !isLocal) {
    throw new Error('VITE_API_BASE_URL must start with https:// in a production build.')
  }

  if (isLocal) {
    console.warn(
      '\n[build] WARNING: VITE_API_BASE_URL points at localhost. ' +
        'Fine for a local test, but do NOT deploy this build.\n'
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    checkProductionEnv(loadEnv(mode, process.cwd(), 'VITE_'))
  }

  return {
    plugins: [react()],
    build: {
      sourcemap: false, // don't publish the readable source
    },
  }
})
