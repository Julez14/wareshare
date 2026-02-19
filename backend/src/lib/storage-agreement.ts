import type { Booking, Listing, InventoryItem } from '../types';

interface AgreementSection {
  key: string;
  title: string;
  summary: string;
  items: Array<{ label: string; value: string }>;
  editable_by_host?: boolean;
  freeform?: boolean;
  content?: string;
}

interface AgreementContent {
  version: string;
  generated_at: string;
  sections: AgreementSection[];
}

export function generateAgreementContent(
  booking: Booking,
  listing: Listing,
  inventory: InventoryItem[]
): AgreementContent {
  const startDate = new Date(booking.start_date).toLocaleDateString('en-CA');
  const endDate = new Date(booking.end_date).toLocaleDateString('en-CA');
  
  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);
  const months = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const totalAmount = booking.monthly_rate * months;

  const sections: AgreementSection[] = [
    {
      key: 'rental_terms',
      title: 'Rental Terms',
      summary: 'What this means for you: You are agreeing to rent warehouse space for the specified period at the agreed monthly rate.',
      items: [
        { label: 'Start Date', value: startDate },
        { label: 'End Date', value: endDate },
        { label: 'Duration', value: `${months} month${months > 1 ? 's' : ''}` },
        { label: 'Space Requested', value: `${booking.space_requested_sqft || 'Not specified'} sq ft` },
        { label: 'Monthly Rate', value: `$${booking.monthly_rate.toLocaleString()} ${listing.currency}` },
        { label: 'Estimated Total', value: `$${totalAmount.toLocaleString()} ${listing.currency}` },
      ],
    },
    {
      key: 'warehouse_details',
      title: 'Warehouse Details',
      summary: 'What this means for you: This is the warehouse space you will be renting.',
      items: [
        { label: 'Listing Title', value: listing.title },
        { label: 'Total Size', value: `${listing.size_sqft.toLocaleString()} sq ft` },
        { label: 'Location', value: `${listing.city}, ${listing.province}` },
        { label: 'Fulfillment Available', value: listing.fulfillment_available ? 'Yes' : 'No' },
      ],
    },
    {
      key: 'inventory_declared',
      title: 'Inventory Declared',
      summary: 'What this means for you: These are the items you plan to store. Please ensure accuracy.',
      items: inventory.map((item, index) => ({
        label: `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} ${index + 1}`,
        value: `${item.name} (Qty: ${item.quantity})${item.category ? ` - ${item.category}` : ''}`,
      })),
    },
    {
      key: 'platform_terms',
      title: 'Standard Platform Terms',
      summary: 'What this means for you: These are the standard terms that apply to all WareShare rentals.',
      items: [
        { label: 'Liability', value: 'WareShare and the host are not liable for loss or damage to stored goods beyond reasonable care.' },
        { label: 'Access', value: 'Access to the warehouse will be arranged between host and renter.' },
        { label: 'Prohibited Items', value: 'Hazardous materials, perishables, and illegal items are strictly prohibited.' },
        { label: 'Termination', value: 'Either party may terminate with 30 days written notice.' },
      ],
    },
    {
      key: 'special_conditions',
      title: 'Special Conditions',
      summary: 'What this means for you: The host may add specific conditions for this rental.',
      items: [],
      editable_by_host: true,
    },
    {
      key: 'notes',
      title: 'Additional Notes',
      summary: 'Any additional information or comments.',
      freeform: true,
      content: '',
    },
  ];

  if (listing.fulfillment_available && listing.fulfillment_description) {
    sections.splice(3, 0, {
      key: 'fulfillment_options',
      title: 'Fulfillment Options',
      summary: 'What this means for you: This warehouse offers fulfillment services.',
      items: [
        { label: 'Description', value: listing.fulfillment_description },
      ],
    });
  }

  return {
    version: '1.0',
    generated_at: new Date().toISOString(),
    sections,
  };
}

export function parseAgreementContent(content: string): AgreementContent {
  try {
    return JSON.parse(content);
  } catch {
    return {
      version: '1.0',
      generated_at: new Date().toISOString(),
      sections: [],
    };
  }
}

export function serializeAgreementContent(content: AgreementContent): string {
  return JSON.stringify(content);
}
