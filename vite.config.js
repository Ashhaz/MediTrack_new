import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
          if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/@remix-run/')) return 'router';
          if (id.includes('node_modules/@supabase/')) return 'supabase';
          if (
            id.includes('node_modules/html2canvas/') ||
            id.includes('node_modules/jspdf/') ||
            id.includes('node_modules/fflate/') ||
            id.includes('node_modules/canvg/') ||
            id.includes('node_modules/dompurify/')
          ) return 'pdf';
          if (id.includes('node_modules/lucide-react/')) return 'icons';
        }
      }
    }
  }
})