import './main.css';
import { registerSection, initShell } from './shell';
import { navSection } from './nav.section';
import { gallerySection } from './gallery.section';
import { singleImageSection } from './single-image.section';
import { pdpBuyBoxSection } from './pdp-buy-box.section';
import { faqSection } from './faq.section';

// Register sections
registerSection(navSection);
registerSection(gallerySection);
registerSection(singleImageSection);
registerSection(pdpBuyBoxSection);
registerSection(faqSection);

// Boot
initShell();
