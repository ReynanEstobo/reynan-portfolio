import React, { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './responsive.css';
import './walker.css';
const PixelWalker = lazy(() => import('./PixelWalker.jsx'));
createRoot(document.getElementById('root')).render(<StrictMode><App /><Suspense fallback={null}><PixelWalker /></Suspense></StrictMode>);

