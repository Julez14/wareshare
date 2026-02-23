export type Booking = {
  id: string;
  listing_id: string;
  renter_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  space_requested_sqft: number | null;
  monthly_rate: number;
  status:
    | "pending_review"
    | "agreement_draft"
    | "host_edited"
    | "renter_accepted"
    | "confirmed"
    | "rejected"
    | "cancelled";
  rejected_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;

  // INCLUDES JOINS
  listing_title: string;
  listing_city: string;
  listing_province: string;
  renter_name: string;
  host_name: string;
};
