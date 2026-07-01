/**
 * Integration adapter layer.
 *
 * Every external service the product will eventually talk to is defined here as
 * a typed interface with a bundled "mock" implementation. Feature code depends
 * on the interface + the exported singleton — swapping in a real provider (a
 * booking API, Stripe, Twilio, a CRM, an ESP…) is a one-line change here and
 * requires no edits elsewhere. This keeps the app decoupled and scalable.
 *
 * A mock returns a clearly-marked "not configured" result (and `false` where a
 * boolean signals delivery) so callers can degrade gracefully.
 */

export interface AdapterResult<T = unknown> {
  ok: boolean;
  configured: boolean;
  provider: string;
  data?: T;
  message?: string;
}

function notConfigured<T = unknown>(provider: string): AdapterResult<T> {
  return { ok: false, configured: false, provider: "mock", message: `${provider} not configured` };
}

/* ------------------------------------------------------------------ Hotels */
export interface HotelBookingAdapter {
  createBooking(input: {
    hotelId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    roomId?: string;
  }): Promise<AdapterResult<{ confirmation: string }>>;
}
export const hotelBookingService: HotelBookingAdapter = {
  async createBooking() {
    return notConfigured("hotel-booking");
  },
};

/* ------------------------------------------------------------------ Flights */
export interface FlightBookingAdapter {
  search(input: { from: string; to: string; date: string }): Promise<AdapterResult>;
}
export const flightBookingService: FlightBookingAdapter = {
  async search() {
    return notConfigured("flight-booking");
  },
};

/* -------------------------------------------------------------- Restaurants */
export interface RestaurantReservationAdapter {
  reserve(input: { venue: string; date: string; partySize: number }): Promise<AdapterResult>;
}
export const restaurantReservationService: RestaurantReservationAdapter = {
  async reserve() {
    return notConfigured("restaurant-reservations");
  },
};

/* ---------------------------------------------------------------- Ticketing */
export interface EventTicketingAdapter {
  search(input: { city: string; date?: string }): Promise<AdapterResult>;
}
export const eventTicketingService: EventTicketingAdapter = {
  async search() {
    return notConfigured("event-ticketing");
  },
};

/* ------------------------------------------------------------------ Loyalty */
export interface LoyaltyAdapter {
  getPoints(userId: string): Promise<AdapterResult<{ points: number }>>;
  award(userId: string, points: number, reason: string): Promise<AdapterResult>;
}
export const loyaltyService: LoyaltyAdapter = {
  async getPoints() {
    return notConfigured("loyalty");
  },
  async award() {
    return notConfigured("loyalty");
  },
};

/* ----------------------------------------------------------------- Payments */
export interface PaymentAdapter {
  createCheckout(input: {
    userId: string;
    plan: string;
    amount: number;
  }): Promise<AdapterResult<{ checkoutUrl?: string }>>;
  cancelSubscription(userId: string): Promise<AdapterResult>;
}
/**
 * Mock payments: no real charge. The subscription API applies the plan change
 * directly and records a simulated billing entry. Swap for Stripe here.
 */
export const paymentService: PaymentAdapter = {
  async createCheckout() {
    return { ok: true, configured: false, provider: "mock", data: {} };
  },
  async cancelSubscription() {
    return { ok: true, configured: false, provider: "mock" };
  },
};

/* ---------------------------------------------------------------------- CRM */
export interface CrmAdapter {
  upsertContact(input: { email: string; name: string; tier: string }): Promise<AdapterResult>;
}
export const crmService: CrmAdapter = {
  async upsertContact() {
    return notConfigured("crm");
  },
};

/* -------------------------------------------------------- Push notifications */
export interface NotificationAdapter {
  push(userId: string, title: string, body: string): Promise<AdapterResult>;
}
export const notificationService: NotificationAdapter = {
  async push() {
    return notConfigured("push-notifications");
  },
};

/* --------------------------------------------------------------------- Email */
export interface EmailAdapter {
  /** Returns true only if a real provider actually delivered the message. */
  sendPasswordReset(to: string, link: string): Promise<boolean>;
  sendMarketing(to: string, campaign: string): Promise<boolean>;
}
export const emailService: EmailAdapter = {
  async sendPasswordReset() {
    return false; // no ESP configured — caller surfaces the link in dev
  },
  async sendMarketing() {
    return false;
  },
};
