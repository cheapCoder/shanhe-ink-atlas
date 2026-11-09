import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ma-shan-zheng/400.css';
import '@fontsource/noto-serif-sc/400.css';
import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@/styles/global.css';
import App from './App';
import SpriteGallery from '@/modules/ink_sprites/SpriteGallery';

const gallery = import.meta.env.DEV && new URLSearchParams(location.search).has('sprites');

createRoot(document.getElementById('root')!).render(<StrictMode>{gallery ? <SpriteGallery /> : <App />}</StrictMode>);
