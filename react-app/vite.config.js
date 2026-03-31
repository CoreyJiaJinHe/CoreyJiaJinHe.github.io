import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isUserOrOrgSite = repo.endsWith('.github.io')
const base = !repo || isUserOrOrgSite ? '/' : `/${repo}/`

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
