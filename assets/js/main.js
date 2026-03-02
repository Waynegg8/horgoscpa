/* HorgosCPA Main — Entry Point */

import { initComponents, initSEO } from './modules/components.js';
import { initUIEffects }           from './modules/ui-effects.js';
import { initFAQ }                 from './modules/faq.js';
import { initContentLoader }       from './modules/content-loader.js';

document.addEventListener('DOMContentLoaded', () => {
    initSEO();
    initComponents();
    initUIEffects();
    initFAQ();
    initContentLoader();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
