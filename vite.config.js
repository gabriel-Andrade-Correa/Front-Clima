import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const REPO_NAME = 'Front-Clima'
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const base = process.env.VITE_BASE_PATH || (isGitHubActions ? `/${REPO_NAME}/` : '/')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
})
