export const routes = {
  renter: {
    root: "/renter",
    bookings: {
      root: "/renter/bookings",
      details: (bookingId: string) => `/renter/bookings/${bookingId}`,
    },
    listings: {
      root: "/renter/listings",
      details: (listingId: string) => `/renter/listings/${listingId}`,
    },
    inventory: {
      root: "/renter/inventory",
    },
    messages: {
      root: "/renter/messages",
    },
    profile: "/renter/profile",
  },
  login: "/login",
  signup: "/signup",
};
