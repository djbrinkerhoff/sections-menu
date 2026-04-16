import './main.css';
import { registerSection, initShell } from './shell';
import { navSection } from './nav.section';
import { gallerySection } from './gallery.section';

// Register sections
registerSection(navSection);
registerSection(gallerySection);

// Boot
initShell();
