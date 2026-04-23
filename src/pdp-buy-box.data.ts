export interface PdpBuyBoxImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface PdpBuyBoxOption {
  label: string;
  price: string;
  /** true = always sold out; string[] = sold out only for these select-group values */
  soldOut?: boolean | string[];
}

export interface PdpBuyBoxSelectGroup {
  label: string;
  placeholder: string;
  options: PdpBuyBoxOption[];
  defaultValue: string;
}

export interface PdpBuyBoxChipGroup {
  label: string;
  options: PdpBuyBoxOption[];
  defaultValue: string | null;
}

export interface PdpBuyBoxInfoSection {
  title: string;
  lead?: string;
  body: string;
  bullets?: string[];
}

export interface PdpBuyBoxProduct {
  id: string;
  label: string;
  title: string;
  price: string;
  stockLabel: string;
  stockCount?: number;
  variantStockCounts?: Record<string, number>;
  bnplMessage: string;
  shippingNote: string;
  ctaLabel: string;
  selectGroup: PdpBuyBoxSelectGroup;
  chipGroup: PdpBuyBoxChipGroup;
  quantityDefault: number;
  images: PdpBuyBoxImage[];
  description: PdpBuyBoxInfoSection;
  shipping: PdpBuyBoxInfoSection;
  returns: PdpBuyBoxInfoSection;
}

function createVariantStockKey(selectValue: string, chipValue: string): string {
  return `select:${selectValue}|chip:${chipValue}`;
}

export const PDP_BUY_BOX_PRODUCTS: PdpBuyBoxProduct[] = [
  {
    id: 'summit-tee',
    label: 'Summit Tee',
    title: 'Very cool t-shirt',
    price: '$12.00',
    stockLabel: 'In stock',
    variantStockCounts: {
      [createVariantStockKey('Charcoal', 'Small')]: 9,
      [createVariantStockKey('Charcoal', 'Medium')]: 7,
      [createVariantStockKey('Charcoal', 'Large')]: 4,
      [createVariantStockKey('Bone', 'Small')]: 8,
      [createVariantStockKey('Bone', 'Medium')]: 5,
      [createVariantStockKey('Bone', 'XL')]: 2,
      [createVariantStockKey('Clay', 'Small')]: 6,
      [createVariantStockKey('Clay', 'Medium')]: 4,
      [createVariantStockKey('Clay', 'Large')]: 3,
      [createVariantStockKey('Clay', 'XL')]: 1,
    },
    bnplMessage: 'As low as $10/month or interest free. See plans',
    shippingNote: 'Ships in 5 business days • Returns accepted',
    ctaLabel: 'Add to [cart]',
    selectGroup: {
      label: 'Color',
      placeholder: 'Choose...',
      options: [
        { label: 'Charcoal', price: '$12.00' },
        { label: 'Bone', price: '$12.00' },
        { label: 'Mist', price: '$14.00', soldOut: true },
        { label: 'Clay', price: '$14.00' },
      ],
      defaultValue: '',
    },
    chipGroup: {
      label: 'Size',
      options: [
        { label: 'Small', price: '$12.00' },
        { label: 'Medium', price: '$12.00' },
        { label: 'Large', price: '$14.00', soldOut: ['Bone'] },
        { label: 'XL', price: '$18.00', soldOut: ['Charcoal'] },
      ],
      defaultValue: null,
    },
    quantityDefault: 1,
    images: [
      {
        src: '/images/pdp-buy-box/summit-tee-01.png',
        alt: 'Folded charcoal Summit tee on a sunlit oak table.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/summit-tee-02.png',
        alt: 'Charcoal Summit tee styled on a stone plinth with soft daylight.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/summit-tee-03.png',
        alt: 'Close crop of the Summit tee neck and chest embroidery.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/summit-tee-04.png',
        alt: 'Summit tee draped over a clean birch stool in a bright studio.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/summit-tee-05.png',
        alt: 'Flat lay of the Summit tee with matching packing card and hang tag.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/summit-tee-06.png',
        alt: 'Summit tee folded beside eucalyptus stems and warm afternoon light.',
        width: 1400,
        height: 1400,
      },
    ],
    description: {
      title: 'Description',
      body: 'Practical does not have to be boring. Our garment-dyed Summit Tee is cut from a smooth, midweight cotton jersey with an easy drape for everyday wear.',
      bullets: [
        'Soft-washed cotton with a broken-in hand feel',
        'Relaxed fit with dropped shoulder seams',
        'Clean tonal embroidery at the chest',
        'Pre-shrunk fabric for a consistent fit',
        'Machine washable',
      ],
    },
    shipping: {
      title: 'Shipping',
      lead: 'Free U.S. Shipping Over $50',
      body: 'All domestic orders over $50 ship free via DHL Ground Shipping. Orders under the threshold ship with real-time carrier rates at checkout.',
    },
    returns: {
      title: 'Returns',
      body: 'We are happy to offer domestic returns on any product in unused condition within 30 days. Final-sale items are excluded.',
    },
  },
  {
    id: 'crescent-bag',
    label: 'Crescent Bag',
    title: 'Medium nylon crescent bag',
    price: '$64.00',
    stockLabel: 'In stock',
    variantStockCounts: {
      [createVariantStockKey('Black', 'Short')]: 7,
      [createVariantStockKey('Black', 'Regular')]: 5,
      [createVariantStockKey('Black', 'Crossbody')]: 2,
      [createVariantStockKey('Moss', 'Short')]: 6,
      [createVariantStockKey('Moss', 'Regular')]: 4,
      [createVariantStockKey('Moss', 'Long')]: 2,
      [createVariantStockKey('Clay', 'Short')]: 5,
      [createVariantStockKey('Clay', 'Regular')]: 4,
      [createVariantStockKey('Clay', 'Long')]: 2,
      [createVariantStockKey('Clay', 'Crossbody')]: 1,
    },
    bnplMessage: 'As low as $16/month or interest free. See plans',
    shippingNote: 'Ships in 3 business days • Returns accepted',
    ctaLabel: 'Add to [cart]',
    selectGroup: {
      label: 'Color',
      placeholder: 'Choose...',
      options: [
        { label: 'Black', price: '$64.00' },
        { label: 'Moss', price: '$64.00' },
        { label: 'Cocoa', price: '$68.00', soldOut: true },
        { label: 'Clay', price: '$68.00' },
      ],
      defaultValue: '',
    },
    chipGroup: {
      label: 'Strap',
      options: [
        { label: 'Short', price: '$64.00' },
        { label: 'Regular', price: '$64.00' },
        { label: 'Long', price: '$72.00', soldOut: ['Black'] },
        { label: 'Crossbody', price: '$78.00', soldOut: ['Moss'] },
      ],
      defaultValue: null,
    },
    quantityDefault: 1,
    images: [
      {
        src: '/images/pdp-buy-box/crescent-bag-01.png',
        alt: 'Black nylon crescent bag resting on a linen bench in morning light.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/crescent-bag-02.png',
        alt: 'Crescent bag standing upright on a pale clay plinth.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/crescent-bag-03.png',
        alt: 'Top-down product shot of the crescent bag with zipper and strap details.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/crescent-bag-04.png',
        alt: 'Crescent bag styled beside a folded overshirt and ceramic cup.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/crescent-bag-05.png',
        alt: 'Close crop of the crescent bag hardware and recycled nylon texture.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/crescent-bag-06.png',
        alt: 'Crescent bag angled against a white wall with long afternoon shadows.',
        width: 1400,
        height: 1400,
      },
    ],
    description: {
      title: 'Description',
      body: 'Our Medium Nylon Crescent Bag is the everyday carry that holds more than it looks like it should. The curved profile hugs close while the recycled shell stays feather-light.',
      bullets: [
        'Recycled ripstop shell with recycled lining',
        'Interior zip pocket and key leash',
        'Webbing strap with four wear options',
        'Matte black hardware and clean seam finish',
        'Wipe clean with mild soap and water',
      ],
    },
    shipping: {
      title: 'Shipping',
      lead: 'Free U.S. Shipping Over $50',
      body: 'Orders typically leave our studio within three business days. Domestic orders over $50 ship free via DHL Ground Shipping.',
    },
    returns: {
      title: 'Returns',
      body: 'Returns are accepted within 30 days on unused bags with original tags attached. Final-sale markdowns are excluded.',
    },
  },
  {
    id: 'ridge-hoodie',
    label: 'Ridge Hoodie',
    title: 'Heavyweight ridge hoodie',
    price: '$88.00',
    stockLabel: 'Low stock',
    stockCount: 2,
    bnplMessage: 'As low as $22/month or interest free. See plans',
    shippingNote: 'Ships in 4 business days • Returns accepted',
    ctaLabel: 'Add to [cart]',
    selectGroup: {
      label: '',
      placeholder: '',
      options: [],
      defaultValue: '',
    },
    chipGroup: {
      label: '',
      options: [],
      defaultValue: null,
    },
    quantityDefault: 1,
    images: [
      {
        src: '/images/pdp-buy-box/ridge-hoodie-01.png',
        alt: 'Folded graphite Ridge hoodie on a raw wood worktable.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/ridge-hoodie-02.png',
        alt: 'Ridge hoodie hanging from a brushed steel rail in a quiet studio.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/ridge-hoodie-03.png',
        alt: 'Close crop of the Ridge hoodie hood, drawcord, and brushed fleece interior.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/ridge-hoodie-04.png',
        alt: 'Ridge hoodie styled with a cap and canvas tote on a limestone bench.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/ridge-hoodie-05.png',
        alt: 'Ridge hoodie neatly folded with sleeve logo detail visible.',
        width: 1400,
        height: 1400,
      },
      {
        src: '/images/pdp-buy-box/ridge-hoodie-06.png',
        alt: 'Ridge hoodie lit by soft window light against a pale plaster wall.',
        width: 1400,
        height: 1400,
      },
    ],
    description: {
      title: 'Description',
      body: 'The Ridge Hoodie is cut from a dense brushed fleece that feels substantial without losing drape. It is built for cold mornings, layered errands, and long airport days.',
      bullets: [
        '14 oz. cotton blend with brushed interior',
        'Double-layer hood with woven drawcord',
        'Roomy front pocket with bartack reinforcement',
        'Rib hem and cuffs with shape retention',
        'Machine washable on cold',
      ],
    },
    shipping: {
      title: 'Shipping',
      lead: 'Free U.S. Shipping Over $50',
      body: 'Heavyweight fleece styles ship in four business days or less. Domestic orders over $50 include free DHL Ground Shipping.',
    },
    returns: {
      title: 'Returns',
      body: 'You can return unworn fleece within 30 days of delivery. We only ask that original packaging and tags come back with the item.',
    },
  },
];

export const DEFAULT_PDP_BUY_BOX_PRODUCT_ID = PDP_BUY_BOX_PRODUCTS[0]?.id ?? '';

export function getPdpBuyBoxProduct(productId: string | undefined): PdpBuyBoxProduct {
  return PDP_BUY_BOX_PRODUCTS.find((product) => product.id === productId)
    ?? PDP_BUY_BOX_PRODUCTS[0]
    ?? {
      id: '',
      label: '',
      title: '',
      price: '',
      stockLabel: '',
      stockCount: 0,
      variantStockCounts: {},
      bnplMessage: '',
      shippingNote: '',
      ctaLabel: '',
      selectGroup: { label: '', placeholder: '', options: [] as PdpBuyBoxOption[], defaultValue: '' },
      chipGroup: { label: '', options: [] as PdpBuyBoxOption[], defaultValue: null },
      quantityDefault: 1,
      images: [],
      description: { title: '', body: '' },
      shipping: { title: '', body: '' },
      returns: { title: '', body: '' },
    };
}
