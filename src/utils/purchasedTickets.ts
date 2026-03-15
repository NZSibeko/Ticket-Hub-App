const STORAGE_KEY = 'ticket_hub_purchased_tickets';

let inMemoryTickets = [];

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && !!window.localStorage;

const readStoredTickets = () => {
  if (canUseLocalStorage()) {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      return storedValue ? JSON.parse(storedValue) : [];
    } catch (error) {
      return [];
    }
  }

  return inMemoryTickets;
};

const writeStoredTickets = (tickets) => {
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (error) {
    }
  } else {
    inMemoryTickets = tickets;
  }

  return tickets;
};

const getOwnerKey = (user) =>
  String(user?.customer_id || user?.id || user?.email || 'guest');

const getTicketKey = (ticket) =>
  ticket?.ticket_id ||
  ticket?.ticket_code ||
  `${ticket?.event_id || 'event'}-${ticket?.purchase_date || ''}`;

const getTicketLabel = (ticketType) =>
  (ticketType?.label || ticketType?.type || 'General')
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const mergeTicketCollections = (primaryTickets = [], secondaryTickets = []) => {
  const seen = new Set();

  return [...secondaryTickets, ...primaryTickets].filter((ticket) => {
    const ticketKey = getTicketKey(ticket);
    if (!ticketKey || seen.has(ticketKey)) {
      return false;
    }

    seen.add(ticketKey);
    return true;
  });
};

export const getStoredPurchasedTicketsForUser = async (user) => {
  const ownerKey = getOwnerKey(user);
  return readStoredTickets().filter((ticket) => ticket?.purchase_owner === ownerKey);
};

export const persistPurchasedTickets = async (tickets = []) => {
  if (!Array.isArray(tickets) || !tickets.length) {
    return readStoredTickets();
  }

  const mergedTickets = mergeTicketCollections(tickets, readStoredTickets());
  return writeStoredTickets(mergedTickets);
};

export const buildPurchasedTicketBatch = ({
  event,
  ticketType,
  quantity,
  user,
  bookingId,
}) => {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const reference = bookingId || `BK${Date.now()}`;
  const purchaseDate = new Date().toISOString();
  const ownerKey = getOwnerKey(user);
  const ticketLabel = getTicketLabel(ticketType);
  const ticketTypeValue = ticketType?.type || ticketLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const price = Number(ticketType?.price ?? event?.price ?? 0);
  const currency = event?.currency || 'ZAR';
  const imageUrl =
    event?.display_artwork ||
    event?.image_url ||
    event?.event_image ||
    event?.image ||
    '';

  const purchasedTickets = Array.from({ length: safeQuantity }, (_, index) => {
    const suffix = String(index + 1).padStart(2, '0');
    return {
      ticket_id: `${reference}-${suffix}`,
      ticket_code: `TKT-${reference.replace(/[^A-Z0-9-]/gi, '').slice(-10)}-${suffix}`,
      event_id: event?.event_id || event?.id || `event-${reference}`,
      event_name: event?.event_name || 'Live Event',
      event_date: event?.start_date || purchaseDate,
      location: event?.location || 'Venue TBC',
      ticket_type: ticketTypeValue,
      price,
      currency,
      ticket_status: 'ACTIVE',
      purchase_date: purchaseDate,
      image_url: imageUrl,
      venue: event?.venue || event?.location || 'Venue TBC',
      organizer: event?.organizer || 'Ticket-Hub',
      current_attendees: Number(event?.current_attendees || 0),
      max_attendees: Number(event?.max_attendees || 0),
      purchase_owner: ownerKey,
      booking_reference: reference,
    };
  });

  return {
    purchasedTickets,
    bookingDetails: {
      bookingId: reference,
      eventName: event?.event_name || 'Live Event',
      ticketCount: safeQuantity,
      totalAmount: price * safeQuantity,
      eventDate: event?.start_date || purchaseDate,
      location: event?.location || 'Venue TBC',
      ticketType: ticketLabel,
      currency,
      organizer: event?.organizer || 'Ticket-Hub',
      imageUrl,
    },
  };
};
