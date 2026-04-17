import './main.css';
import { registerSection, initShell } from './shell';
import { navSection } from './nav.section';
import { gallerySection } from './gallery.section';
import { singleImageSection } from './single-image.section';

// Register sections
registerSection(navSection);
registerSection(gallerySection);
registerSection(singleImageSection);

// Boot
initShell();
