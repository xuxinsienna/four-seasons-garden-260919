import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base:'/four-seasons-garden-260919/',
  plugins:[react()],
  build:{outDir:'dist-github',emptyOutDir:true,target:'es2022'},
});
