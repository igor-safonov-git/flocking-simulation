import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        open: true
    },
    build: {
        rollupOptions: {
            input: 'src/main.js'
        }
    }
}); 