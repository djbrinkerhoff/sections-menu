export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS = [
  {
    question: 'How long does shipping take?',
    answer: 'Most orders ship within 2-3 business days. Delivery timing depends on the shipping method selected at checkout.',
  },
  {
    question: 'Can I track my order?',
    answer: 'Yes. After your order ships, you will receive a confirmation email with tracking details.',
  },
  {
    question: 'What is your return policy?',
    answer: 'Unused items can be returned within 30 days of delivery. Final sale items are not eligible for return.',
  },
  {
    question: 'Can I exchange an item?',
    answer: 'Exchanges are available when replacement inventory is in stock. Start a return and choose exchange as the preferred resolution.',
  },
  {
    question: 'How do I choose the right size?',
    answer: 'Use the size guide on each product page and compare it with an item you already own.',
  },
  {
    question: 'Do you ship internationally?',
    answer: 'International shipping availability depends on the destination and shipping carrier options at checkout.',
  },
  {
    question: 'Can I change or cancel my order?',
    answer: 'Contact support as soon as possible. Orders can only be changed or canceled before they are packed.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'The shop accepts major credit cards and other payment methods shown at checkout.',
  },
  {
    question: 'Do you offer gift cards?',
    answer: 'Gift cards can be offered as a digital product and delivered by email after purchase.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Use the contact link in the shop footer and include your order number when the question is order-related.',
  },
] as const satisfies readonly FaqItem[];
