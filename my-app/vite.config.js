import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: './', // Important pour les fichiers statiques
    build: {
        outDir: 'dist', // Dossier de sortie pour Capacitor
    },
});