import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// trigger rebuild for .env.production fix

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})