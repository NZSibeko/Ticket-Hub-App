const axios = require('axios');
const cheerio = require('cheerio');

const LIVE_TICKET_CACHE_TTL_MS = Number(process.env.PLANNER_LIVE_TICKET_CACHE_TTL_MS || 15 * 60 * 1000);
const liveTicketCache = new Map();

const normalizeWhitespace = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const PROVIDER_SELECTOR_MAP = {
  quicket: [
    '[data-testid*="ticket"]',
    '[class*="ticket-option"]',
    '[class*="ticketOption"]',
    '[class*="ticket-card"]',
  ],
  webtickets: [
    '[class*="ticket-type"]',
    '[class*="ticketType"]',
    '[class*="price-item"]',
    '[class*="event-ticket"]',
  ],
  howler: [
    '[class*="ticketTier"]',
    '[class*="ticket-tier"]',
    '[class*="pricing-tier"]',
    '[class*="ticket-card"]',
  ],
  computicket: [
    '[class*="ticket"]',
    '[class*="priceRow"]',
    '[class*="ticket-price"]',
    '[class*="seat-option"]',
  ],
};

const parseCurrencyCode = (value, fallback = 'ZAR') => {
  const text = normalizeWhitespace(value).toUpperCase();
  if (!text) {
    return fallback;
  }

  if (text.includes('USD') || text.includes('$')) return 'USD';
  if (text.includes('EUR') || text.includes('€')) return 'EUR';
  if (text.includes('GBP') || text.includes('£')) return 'GBP';
  if (text.includes('ZAR') || text.includes('R')) return 'ZAR';

  return fallback;
};

const parsePriceValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = normalizeWhitespace(value);
  if (!text) {
    return null;
  }

  let normalized = text.replace(/[^\d,.-]/g, '');
  if (!normalized) {
    return null;
  }

  if (normalized.includes(',') && normalized.includes('.')) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (normalized.includes(',') && !normalized.includes('.')) {
    const parts = normalized.split(',');
    normalized = parts[parts.length - 1].length === 2
      ? normalized.replace(',', '.')
      : normalized.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parseQuantityValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const detectProvider = (sourceUrl = '', fallbackProvider = '') => {
  const haystack = `${sourceUrl} ${fallbackProvider}`.toLowerCase();

  if (haystack.includes('quicket')) return 'quicket';
  if (haystack.includes('webtickets')) return 'webtickets';
  if (haystack.includes('howler')) return 'howler';
  if (haystack.includes('computicket')) return 'computicket';
  return 'generic';
};

const buildSourceLabel = (event, fallbackIntelligence) => {
  if (fallbackIntelligence?.sourceLabel) {
    return fallbackIntelligence.sourceLabel;
  }

  if (typeof event.ticketingProvider === 'string' && event.ticketingProvider.trim()) {
    return event.ticketingProvider.trim();
  }

  if (typeof event.sourceUrl === 'string' && event.sourceUrl.trim()) {
    try {
      const parsedUrl = new URL(event.sourceUrl.startsWith('http') ? event.sourceUrl : `https://${event.sourceUrl}`);
      return parsedUrl.hostname.replace(/^www\./i, '');
    } catch (error) {
      return event.sourceUrl;
    }
  }

  return 'External listing';
};

const dedupeTicketTypes = (ticketTypes) => {
  const uniqueTickets = new Map();

  for (const ticketType of ticketTypes) {
    const name = normalizeWhitespace(ticketType?.name || 'Standard Admission');
    const price = Number.isFinite(ticketType?.price) ? ticketType.price : 'na';
    const key = `${name.toLowerCase()}::${price}`;

    if (!uniqueTickets.has(key)) {
      uniqueTickets.set(key, {
        id: ticketType.id || key,
        name,
        price: Number.isFinite(ticketType?.price) ? ticketType.price : null,
        quantity: Number.isFinite(ticketType?.quantity) ? ticketType.quantity : null,
        currency: ticketType.currency || 'ZAR',
      });
    }
  }

  return Array.from(uniqueTickets.values());
};

const pushTicketType = (bucket, candidate) => {
  if (!candidate) {
    return;
  }

  const name = normalizeWhitespace(candidate.name || '');
  const price = Number.isFinite(candidate.price) ? candidate.price : null;

  if (!name && price === null) {
    return;
  }

  bucket.push({
    id: candidate.id,
    name: name || 'Standard Admission',
    price,
    quantity: Number.isFinite(candidate.quantity) ? candidate.quantity : null,
    currency: candidate.currency || 'ZAR',
  });
};

const collectOfferNodes = (bucket, node, contextName = '', fallbackCurrency = 'ZAR') => {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectOfferNodes(bucket, item, contextName, fallbackCurrency));
    return;
  }

  if (typeof node !== 'object') {
    return;
  }

  const name = normalizeWhitespace(node.name || node.ticketName || node.label || contextName);
  const currency = parseCurrencyCode(node.priceCurrency || node.currency, fallbackCurrency);
  const price = parsePriceValue(
    node.price ??
    node.lowPrice ??
    node.highPrice ??
    node.amount ??
    node.cost
  );
  const quantity = parseQuantityValue(
    node.inventoryLevel ??
    node.remainingAttendeeCapacity ??
    node.remaining ??
    node.quantity ??
    node.available ??
    node.capacity
  );

  if (price !== null) {
    pushTicketType(bucket, {
      id: node.id || node['@id'],
      name,
      price,
      quantity,
      currency,
    });
  }

  if (node.offers) {
    collectOfferNodes(bucket, node.offers, name, currency);
  }

  if (node.priceSpecification) {
    collectOfferNodes(bucket, node.priceSpecification, name, currency);
  }

  for (const [key, value] of Object.entries(node)) {
    if (
      key === 'offers' ||
      key === 'priceSpecification' ||
      key === '@context' ||
      key === '@type' ||
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      continue;
    }

    collectOfferNodes(bucket, value, name, currency);
  }
};

const extractJsonTicketTypes = ($, fallbackCurrency) => {
  const bucket = [];

  $('script[type="application/ld+json"]').each((index, element) => {
    const rawContent = $(element).html();
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';

    if (!content) {
      return;
    }

    try {
      const payload = JSON.parse(content);
      collectOfferNodes(bucket, payload, '', fallbackCurrency);
    } catch (error) {
      return;
    }
  });

  const ticketTypes = dedupeTicketTypes(bucket);
  return {
    ticketTypes,
    mode: ticketTypes.length > 0 ? 'structured-data' : null,
  };
};

const extractDomTicketTypes = ($, fallbackCurrency, selectors = null, mode = 'generic-dom') => {
  const bucket = [];
  const effectiveSelectors = selectors || [
    '[data-ticket-id]',
    '[data-testid*="ticket"]',
    '[class*="ticket"]',
    '[class*="Ticket"]',
    '[class*="tier"]',
    '[class*="Tier"]',
    '[class*="admission"]',
    '[class*="Admission"]',
    '[class*="offer"]',
    '[class*="Offer"]',
  ];

  const elements = [];
  effectiveSelectors.forEach((selector) => {
    $(selector).each((index, element) => {
      elements.push(element);
    });
  });

  Array.from(new Set(elements)).slice(0, 80).forEach((element, index) => {
    const blockText = normalizeWhitespace($(element).text());

    if (!blockText || blockText.length > 220) {
      return;
    }

    const hasTicketLanguage = /ticket|admission|pass|vip|early bird|general/i.test(blockText);
    const priceMatch = blockText.match(/(?:ZAR|USD|EUR|GBP|R|\$|€|£)\s?\d[\d\s,.]*/i);
    const price = parsePriceValue(priceMatch ? priceMatch[0] : null);

    if (!hasTicketLanguage && price === null) {
      return;
    }

    const headingText = normalizeWhitespace(
      $(element).find('h1,h2,h3,h4,strong,b,[class*="name"],[class*="title"]').first().text()
    );
    const inferredName = headingText || normalizeWhitespace(
      blockText
        .split(/(?:ZAR|USD|EUR|GBP|R|\$|€|£)\s?\d[\d\s,.]*/i)[0]
        .replace(/\b(?:tickets?|available|remaining|from|buy now|book now)\b/ig, '')
    );
    const quantityMatch = blockText.match(/(\d[\d,]*)\s+(?:left|remaining|available)/i);
    const quantity = quantityMatch ? parseQuantityValue(quantityMatch[1].replace(/,/g, '')) : null;

    pushTicketType(bucket, {
      id: `dom-${index}`,
      name: inferredName || 'Standard Admission',
      price,
      quantity,
      currency: parseCurrencyCode(priceMatch ? priceMatch[0] : fallbackCurrency, fallbackCurrency),
    });
  });

  const ticketTypes = dedupeTicketTypes(bucket);
  return {
    ticketTypes,
    mode: ticketTypes.length > 0 ? mode : null,
  };
};

const readCachedTicketIntel = (cacheKey) => {
  const cachedEntry = liveTicketCache.get(cacheKey);
  if (!cachedEntry) {
    return null;
  }

  if (Date.now() - cachedEntry.cachedAt > LIVE_TICKET_CACHE_TTL_MS) {
    liveTicketCache.delete(cacheKey);
    return null;
  }

  return {
    ...cachedEntry.value,
    liveStatus: 'cached',
  };
};

const writeCachedTicketIntel = (cacheKey, value) => {
  liveTicketCache.set(cacheKey, {
    cachedAt: Date.now(),
    value,
  });
};

const buildTicketIntelligence = (event, ticketTypes, fallbackIntelligence = null, status = 'live', metadata = {}) => {
  const normalizedTypes = dedupeTicketTypes(ticketTypes);
  const validPrices = normalizedTypes
    .map((ticketType) => ticketType.price)
    .filter((price) => Number.isFinite(price));

  const fallbackMinPrice = Number(fallbackIntelligence?.minPrice);
  const fallbackMaxPrice = Number(fallbackIntelligence?.maxPrice);
  const fallbackInventory = Number(fallbackIntelligence?.inventory);
  const currency = normalizedTypes[0]?.currency || fallbackIntelligence?.currency || event.currency || 'ZAR';

  const minPrice = validPrices.length
    ? Math.min(...validPrices)
    : Number.isFinite(fallbackMinPrice)
      ? fallbackMinPrice
      : null;
  const maxPrice = validPrices.length
    ? Math.max(...validPrices)
    : Number.isFinite(fallbackMaxPrice)
      ? fallbackMaxPrice
      : minPrice;
  const inventory = normalizedTypes.reduce((total, ticketType) => total + (ticketType.quantity || 0), 0);

  return {
    ...(fallbackIntelligence || {}),
    sourceLabel: buildSourceLabel(event, fallbackIntelligence),
    totalTypes: normalizedTypes.length || fallbackIntelligence?.totalTypes || 0,
    minPrice,
    maxPrice,
    inventory: inventory > 0 ? inventory : Number.isFinite(fallbackInventory) ? fallbackInventory : null,
    currency,
    hasStructuredTickets: normalizedTypes.length > 0 || Boolean(fallbackIntelligence?.hasStructuredTickets),
    hasTicketSignal: Boolean(
      normalizedTypes.length ||
      minPrice !== null ||
      fallbackIntelligence?.hasTicketSignal ||
      event.hasTicketing
    ),
    types: normalizedTypes.length > 0
      ? normalizedTypes
      : Array.isArray(fallbackIntelligence?.types)
        ? fallbackIntelligence.types
        : [],
    liveStatus: status,
    scrapedAt: new Date().toISOString(),
    scrapeMode: metadata.scrapeMode || fallbackIntelligence?.scrapeMode || status,
    providerHint: metadata.providerHint || fallbackIntelligence?.providerHint || detectProvider(event?.sourceUrl, event?.ticketingProvider),
    parseConfidence: metadata.parseConfidence || fallbackIntelligence?.parseConfidence || 32,
    extractedFields: metadata.extractedFields || fallbackIntelligence?.extractedFields || ['source'],
    ...(metadata.liveError ? { liveError: metadata.liveError } : {}),
  };
};

const scrapeLiveTicketIntel = async (event, fallbackIntelligence = null, options = {}) => {
  if (!event?.sourceUrl) {
    return buildTicketIntelligence(event || {}, [], fallbackIntelligence, 'skipped', {
      scrapeMode: 'skipped',
      providerHint: detectProvider(event?.sourceUrl, event?.ticketingProvider),
      parseConfidence: 18,
      extractedFields: fallbackIntelligence?.extractedFields || ['source'],
    });
  }

  const sourceUrl = event.sourceUrl.startsWith('http') ? event.sourceUrl : `https://${event.sourceUrl}`;
  const cacheKey = `${event.id || 'event'}::${sourceUrl}`;
  const providerHint = detectProvider(sourceUrl, event.ticketingProvider);
  const cachedTicketIntel = !options.force ? readCachedTicketIntel(cacheKey) : null;
  if (cachedTicketIntel) {
    return cachedTicketIntel;
  }

  try {
    const response = await axios.get(sourceUrl, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36',
        'Accept-Language': 'en-ZA,en;q=0.9',
      },
    });

    const html = typeof response.data === 'string' ? response.data : '';
    const $ = cheerio.load(html);
    const metaCurrency = parseCurrencyCode(
      $('meta[property="product:price:currency"]').attr('content') ||
      $('meta[name="price:currency"]').attr('content') ||
      fallbackIntelligence?.currency ||
      event.currency ||
      'ZAR',
      'ZAR'
    );
    const metaPrice = parsePriceValue(
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[name="price"]').attr('content')
    );

    let extracted = extractDomTicketTypes(
      $,
      metaCurrency,
      PROVIDER_SELECTOR_MAP[providerHint],
      providerHint !== 'generic' ? 'provider-dom' : 'generic-dom'
    );

    if (extracted.ticketTypes.length === 0) {
      extracted = extractJsonTicketTypes($, metaCurrency);
    }

    if (extracted.ticketTypes.length === 0) {
      extracted = extractDomTicketTypes($, metaCurrency);
    }

    let parseConfidence = 68;
    if (extracted.mode === 'provider-dom') parseConfidence = 84;
    if (extracted.mode === 'structured-data') parseConfidence = 90;

    let ticketTypes = extracted.ticketTypes;
    let scrapeMode = extracted.mode;

    if (ticketTypes.length === 0 && metaPrice !== null) {
      ticketTypes = [{
        id: `${event.id || 'event'}-meta-price`,
        name: 'Standard Admission',
        price: metaPrice,
        quantity: null,
        currency: metaCurrency,
      }];
      scrapeMode = 'meta-fallback';
      parseConfidence = 46;
    }

    const extractedFields = [
      'source',
      ...(ticketTypes.length > 0 ? ['ticketTypes', 'priceRange'] : metaPrice !== null ? ['priceRange'] : []),
      ...(ticketTypes.some((ticketType) => Number.isFinite(ticketType.quantity)) ? ['inventory'] : []),
      ...(metaCurrency ? ['currency'] : []),
    ];

    const liveTicketIntelligence = buildTicketIntelligence(event, ticketTypes, fallbackIntelligence, 'live', {
      scrapeMode,
      providerHint,
      parseConfidence,
      extractedFields,
    });
    writeCachedTicketIntel(cacheKey, liveTicketIntelligence);
    return liveTicketIntelligence;
  } catch (error) {
    return {
      ...buildTicketIntelligence(event, [], fallbackIntelligence, 'fallback', {
        scrapeMode: 'fallback',
        providerHint,
        parseConfidence: 24,
        extractedFields: fallbackIntelligence?.extractedFields || ['source'],
        liveError: error.message,
      }),
    };
  }
};

module.exports = {
  scrapeLiveTicketIntel,
};
