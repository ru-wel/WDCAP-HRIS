import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// trigger rebuild for .env.production fix

export default defineConfig(({ mode }) => {
  
  const env = loadEnv(mode, process.cwd(), '')

  // log to see in cloud build
  console.log("----------------------------------------------------")
  console.log(`Current Build Mode: ${mode}`)
  console.log(`VITE_API_BASE_URL is: ${env.VITE_API_BASE_URL}`)
  console.log("----------------------------------------------------")

  return {
    plugins: [
      tailwindcss(),
    ],
  }
})