/* HorgosCPA Main — Entry Point */

import { initComponents }    from './modules/components.js';
import { initUIEffects }     from './modules/ui-effects.js';
import { initFAQ }           from './modules/faq.js';
import { initContentLoader } from './modules/content-loader.js';

document.addEventListener('DOMContentLoaded', () => {
    initComponents();
    initUIEffects();
    initFAQ();
    initContentLoader();
});
