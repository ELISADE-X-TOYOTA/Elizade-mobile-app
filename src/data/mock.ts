import {
  AppNotification,
  Booking,
  Conversation,
  OwnedVehicle,
  RecallNotice,
  ServiceAppointment,
  ServiceHistoryItem,
  ServiceJob,
  SupportTicket,
  TicketMessage,
  UserProfile,
  Vehicle,
  WarrantyCertificate,
  WarrantyClaim,
} from '../domain/types';

/** Bundled demo content for Elizade Connect — Elizade's real brands
 *  (Toyota, Jetour, JAC), sale-only. Toyota photos are stable Wikimedia
 *  Commons images (same source the web app uses). */

const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb';

export const MOCK_USER: UserProfile = {
  id: 'u1',
  firstName: 'John',
  lastName: 'Adewale',
  email: 'john.adewale@example.com',
  phone: '+234 803 000 1122',
  city: 'Lagos',
  role: 'customer',
};

/** Elizade showrooms — used by the test-drive / reservation flow. */
export interface Showroom {
  id: string;
  name: string;
  city: string;
  state: string;
}

export const SHOWROOMS: Showroom[] = [
  { id: 's1', name: 'Elizade Victoria Island', city: 'Victoria Island', state: 'Lagos' },
  { id: 's2', name: 'Elizade Lekki', city: 'Lekki', state: 'Lagos' },
  { id: 's3', name: 'Elizade Ikeja', city: 'Ikeja', state: 'Lagos' },
  { id: 's4', name: 'Elizade Abuja', city: 'Central Area', state: 'Abuja' },
  { id: 's5', name: 'Elizade Port Harcourt', city: 'GRA', state: 'Rivers' },
];

function base(v: Partial<Vehicle> & Pick<Vehicle, 'id' | 'make' | 'model' | 'trim' | 'year' | 'price' | 'category'>): Vehicle {
  return {
    color: 'Pearl White',
    colorHex: '#EDEDED',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    engine: '2.0L',
    seats: 5,
    mileage: 0,
    horsepower: 170,
    rating: 4.7,
    reviewCount: 60,
    location: 'Victoria Island, Lagos',
    images: [],
    features: ['Bluetooth', 'Navigation', 'Reverse Camera', 'Cruise Control', 'Apple CarPlay', 'Android Auto'],
    // Mirrors the shape of the backend's `specs` JSONB so mock mode drives the
    // compare matrix through exactly the same path as live data. Per-vehicle
    // overrides in VEHICLES below give the comparison something to differ on.
    specs: {
      Seating: '5',
      'Fuel Economy': '12.0 km/L',
      Drivetrain: 'FWD',
      Infotainment: '8" Touchscreen',
      Safety: 'Toyota Safety Sense 2.5',
      Warranty: '3 Years / 100,000 km',
    },
    listingTypes: ['sale'],
    ownerHistory: 0,
    isVerified: true,
    dealerName: 'Elizade Motors',
    ...v,
  };
}

export const VEHICLES: Vehicle[] = [
  base({
    id: 'v1',
    make: 'Toyota',
    model: 'Land Cruiser',
    trim: '300 VX',
    year: 2024,
    color: 'Attitude Black',
    colorHex: '#15161A',
    price: 185_000_000,
    category: 'suv',
    fuelType: 'Diesel',
    engine: '3.3L Twin-Turbo V6',
    seats: 7,
    horsepower: 305,
    rating: 4.9,
    reviewCount: 142,
    location: 'Victoria Island, Lagos',
    images: [`${W}/9/9c/2022_Toyota_Land_Cruiser_%28J300%29_ZX_%28cropped%29.jpg/1280px-2022_Toyota_Land_Cruiser_%28J300%29_ZX_%28cropped%29.jpg`],
    features: ['Multi-Terrain Select', 'Navigation', 'Leather Seats', 'Sunroof', 'JBL Audio', 'Parking Sensors'],
  }),
  base({
    id: 'v2',
    make: 'Toyota',
    model: 'Prado',
    trim: 'TXL',
    year: 2024,
    color: 'Silver Metallic',
    colorHex: '#B8BCC0',
    price: 122_000_000,
    category: 'suv',
    fuelType: 'Petrol',
    engine: '2.7L 4-Cylinder',
    seats: 7,
    horsepower: 163,
    rating: 4.8,
    reviewCount: 98,
    location: 'Lekki, Lagos',
    images: [`${W}/6/6e/2016_Toyota_Fortuner_%28New_Zealand%29.jpg/1280px-2016_Toyota_Fortuner_%28New_Zealand%29.jpg`],
  }),
  base({
    id: 'v3',
    make: 'Toyota',
    model: 'Camry',
    trim: 'XLE',
    year: 2024,
    color: 'Celestial Silver',
    colorHex: '#C7CBD0',
    price: 58_000_000,
    category: 'sedan',
    fuelType: 'Petrol',
    engine: '2.5L Dynamic Force',
    horsepower: 203,
    rating: 4.7,
    reviewCount: 76,
    location: 'Ikeja, Lagos',
    images: [`${W}/6/68/2018_Toyota_Camry_%28ASV70R%29_Ascent_sedan_%282018-08-27%29_01.jpg/1280px-2018_Toyota_Camry_%28ASV70R%29_Ascent_sedan_%282018-08-27%29_01.jpg`],
  }),
  base({
    id: 'v4',
    make: 'Toyota',
    model: 'Corolla',
    trim: 'LE',
    year: 2024,
    color: 'Classic Silver',
    colorHex: '#C9CCD0',
    price: 42_000_000,
    category: 'sedan',
    fuelType: 'Petrol',
    engine: '1.8L',
    horsepower: 139,
    rating: 4.8,
    reviewCount: 210,
    location: 'Victoria Island, Lagos',
    images: [`${W}/9/9f/2018_Toyota_Corolla_%28E210%29_Ascent_sedan_%282018-08-27%29_01.jpg/1280px-2018_Toyota_Corolla_%28E210%29_Ascent_sedan_%282018-08-27%29_01.jpg`],
  }),
  base({
    id: 'v5',
    make: 'Toyota',
    model: 'RAV4',
    trim: 'Adventure',
    year: 2024,
    color: 'Ruby Flare Pearl',
    colorHex: '#8C1D1D',
    price: 65_000_000,
    category: 'suv',
    fuelType: 'Hybrid',
    engine: '2.5L Hybrid',
    horsepower: 219,
    rating: 4.8,
    reviewCount: 121,
    location: 'Abuja',
    images: [`${W}/5/5f/2019_Toyota_RAV4_%28AXAH52R%29_GX_%28hybrid%29_wagon_%2818-03-2019%29.jpg/1280px-2019_Toyota_RAV4_%28AXAH52R%29_GX_%28hybrid%29_wagon_%2818-03-2019%29.jpg`],
  }),
  base({
    id: 'v6',
    make: 'Toyota',
    model: 'Hilux',
    trim: 'Adventure 4x4',
    year: 2024,
    color: 'Oxford White',
    colorHex: '#EDEDED',
    price: 78_000_000,
    category: 'pickup',
    fuelType: 'Diesel',
    engine: '2.8L Turbo Diesel',
    horsepower: 201,
    rating: 4.9,
    reviewCount: 134,
    location: 'Port Harcourt',
    images: [`${W}/1/16/2016_Toyota_Hilux_%28GN126R%29_SR5_4-door_utility_%282016-01-06%29.jpg/1280px-2016_Toyota_Hilux_%28GN126R%29_SR5_4-door_utility_%282016-01-06%29.jpg`],
    features: ['4x4', 'Navigation', 'Tow Package', 'Reverse Camera', 'Cruise Control', 'Android Auto'],
  }),
  base({
    id: 'v7',
    make: 'Jetour',
    model: 'Dashing',
    trim: 'Flagship',
    year: 2024,
    color: 'Phantom Grey',
    colorHex: '#5B6066',
    price: 48_000_000,
    category: 'suv',
    fuelType: 'Petrol',
    engine: '1.5L Turbo',
    horsepower: 156,
    rating: 4.6,
    reviewCount: 47,
    location: 'Lekki, Lagos',
    images: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80'],
    features: ['Panoramic Roof', 'Navigation', 'Ambient Lighting', '360 Camera', 'Wireless Charging', 'Apple CarPlay'],
  }),
];

export const vehicleById = (id: string): Vehicle => VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];

// ── Legacy demo content kept for placeholder screens / stats ──────────
const now = Date.now();
const days = (n: number) => new Date(now + n * 86_400_000);

export const BOOKINGS: Booking[] = [
  {
    id: 'b1',
    reference: 'ELZ-8842',
    vehicleId: 'v1',
    vehicleTitle: 'Toyota Land Cruiser',
    vehicleImage: VEHICLES[0].images[0],
    startDate: days(2),
    endDate: days(2),
    pickupLocation: 'Elizade Victoria Island',
    total: 0,
    status: 'upcoming',
    isRental: false,
  },
];

export const CONVERSATIONS: Conversation[] = [
  { id: 'c1', name: 'Elizade Support', lastMessage: 'How can we help with your Land Cruiser?', time: '2m', unread: 1, online: true },
];

const iso = (n: number) => new Date(now + n * 86_400_000).toISOString();

// ── Ownership & service (Phase 2) ────────────────────────────────────
export const OWNED_VEHICLES: OwnedVehicle[] = [
  {
    id: 'ov1',
    vin: 'JTMBBREV50D123456',
    make: 'Toyota',
    model: 'Camry',
    trim: 'XLE',
    year: 2022,
    color: 'Celestial Silver',
    colorHex: '#C7CBD0',
    mileage: 41_200,
    registrationNumber: 'LAG-482-KJA',
    nextServiceDue: iso(12),
    nextServiceMileage: 45_000,
    image: VEHICLES[2].images[0],
  },
  {
    id: 'ov2',
    vin: 'MR0FR22G8N0789012',
    make: 'Toyota',
    model: 'Hilux',
    trim: 'Adventure 4x4',
    year: 2021,
    color: 'Oxford White',
    colorHex: '#EDEDED',
    mileage: 68_400,
    registrationNumber: 'ABC-119-XA',
    nextServiceDue: iso(48),
    nextServiceMileage: 70_000,
    image: VEHICLES[5].images[0],
  },
];

export const ownedVehicleById = (id: string): OwnedVehicle =>
  OWNED_VEHICLES.find((v) => v.id === id) ?? OWNED_VEHICLES[0];

export const SERVICE_APPOINTMENTS: ServiceAppointment[] = [
  {
    id: 'sa1',
    vehicleId: 'ov1',
    vehicleTitle: 'Toyota Camry',
    vehicleImage: VEHICLES[2].images[0],
    branchName: 'Elizade Victoria Island',
    serviceType: 'periodic',
    scheduledAt: iso(0),
    status: 'in_progress',
    issueDescription: '45,000km periodic maintenance',
    mileageAtBooking: 44_980,
  },
  {
    id: 'sa2',
    vehicleId: 'ov1',
    vehicleTitle: 'Toyota Camry',
    vehicleImage: VEHICLES[2].images[0],
    branchName: 'Elizade Lekki',
    serviceType: 'inspection',
    scheduledAt: iso(5),
    status: 'confirmed',
    issueDescription: 'Pre-trip full inspection',
    mileageAtBooking: 45_100,
  },
  {
    id: 'sa3',
    vehicleId: 'ov1',
    vehicleTitle: 'Toyota Camry',
    vehicleImage: VEHICLES[2].images[0],
    branchName: 'Elizade Ikeja',
    serviceType: 'repair',
    scheduledAt: iso(-40),
    status: 'completed',
    issueDescription: 'AC not cooling — compressor check',
    mileageAtBooking: 39_500,
  },
];

export const SERVICE_JOBS: Record<string, ServiceJob> = {
  sa1: {
    appointmentId: 'sa1',
    estimatedCompletion: new Date(now + 3 * 3_600_000).toISOString(),
    technicianNotes: 'Oil & filter replaced. Brake pads at 40% — recommend replacement soon.',
    stages: [
      { label: 'Vehicle Received', completed: true, timestamp: iso(0) },
      { label: 'Inspection', completed: true, timestamp: iso(0) },
      { label: 'Service In Progress', completed: false },
      { label: 'Quality Check', completed: false },
      { label: 'Ready for Collection', completed: false },
    ],
    additionalWork: {
      id: 'aw1',
      description: 'Front brake pad replacement (worn below spec)',
      cost: 85_000,
      status: 'pending_approval',
    },
    invoice: {
      subtotal: 120_000,
      tax: 9_000,
      total: 129_000,
      lineItems: [
        { description: 'Periodic maintenance (45,000km)', amount: 95_000 },
        { description: 'Engine oil & filter', amount: 25_000 },
      ],
    },
  },
};

export const SERVICE_HISTORY: ServiceHistoryItem[] = [
  {
    id: 'sh1',
    vehicleId: 'ov1',
    date: iso(-40),
    type: 'Repair — AC Compressor',
    branchName: 'Elizade Ikeja',
    mileage: 39_500,
    description: 'AC compressor clutch replaced, gas recharged.',
    cost: 145_000,
  },
  {
    id: 'sh2',
    vehicleId: 'ov1',
    date: iso(-190),
    type: 'Periodic Maintenance (40,000km)',
    branchName: 'Elizade Victoria Island',
    mileage: 40_050,
    description: 'Oil, filters, brake inspection, tyre rotation.',
    cost: 98_000,
  },
  {
    id: 'sh3',
    vehicleId: 'ov2',
    date: iso(-75),
    type: 'Periodic Maintenance (65,000km)',
    branchName: 'Elizade Port Harcourt',
    mileage: 65_200,
    description: 'Full service, 4x4 driveline inspection, brake fluid change.',
    cost: 132_000,
  },
];

// ── Warranty & recalls (Phase 3) ─────────────────────────────────────
export const WARRANTY_CERTIFICATES: WarrantyCertificate[] = [
  {
    id: 'wc1',
    vehicleId: 'ov1',
    vehicleTitle: 'Toyota Camry XLE',
    vin: 'JTMBBREV50D123456',
    coverageType: 'Toyota Manufacturer Warranty',
    status: 'active',
    startDate: iso(-730),
    endDate: iso(365),
    mileageLimit: 100_000,
    coverageItems: [
      'Engine & transmission',
      'Electrical systems',
      'Air conditioning & cooling',
      'Steering & suspension',
      'Factory-fitted accessories',
    ],
  },
  {
    id: 'wc2',
    vehicleId: 'ov2',
    vehicleTitle: 'Toyota Hilux Adventure',
    vin: 'MR0FR22G8N0789012',
    coverageType: 'Toyota Manufacturer Warranty',
    status: 'active',
    startDate: iso(-1095),
    endDate: iso(90),
    mileageLimit: 100_000,
    coverageItems: ['Engine & drivetrain', '4x4 system', 'Electrical systems', 'Suspension & brakes'],
  },
];

export const RECALLS: RecallNotice[] = [
  {
    id: 'rc1',
    reference: 'TNL-2026-014',
    title: 'Brake booster inspection',
    description:
      'A limited number of units may have a brake booster that requires inspection and, if necessary, replacement. Free of charge at any Elizade service centre.',
    severity: 'important',
    issuedAt: iso(-8),
    status: 'open',
  },
  {
    id: 'rc2',
    reference: 'TNL-2025-052',
    title: 'Software update — hybrid control unit',
    description: 'Recommended software update for the hybrid control module to improve fuel efficiency.',
    severity: 'informational',
    issuedAt: iso(-120),
    status: 'resolved',
  },
];

export const WARRANTY_CLAIMS: WarrantyClaim[] = [
  {
    id: 'wcl1',
    vehicleTitle: 'Toyota Camry XLE',
    category: 'Air Conditioning',
    description: 'Intermittent cooling under load — requested inspection under warranty.',
    status: 'under_review',
    submittedAt: iso(-4),
  },
];

// ── Support tickets (Phase 4) ────────────────────────────────────────
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

export const SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'tk1',
    reference: 'SUP-3391',
    subject: 'Land Cruiser 300 — availability & pricing',
    category: 'sales',
    status: 'in_progress',
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(1),
    lastMessage: 'We have two units at VI. Would you like to book a test drive?',
  },
  {
    id: 'tk2',
    reference: 'SUP-3372',
    subject: 'Invoice query on last service',
    category: 'billing',
    status: 'open',
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
    lastMessage: 'Could you clarify the labour charge on ELZ-8501?',
  },
  {
    id: 'tk3',
    reference: 'SUP-3208',
    subject: 'Warranty coverage for A/C compressor',
    category: 'warranty',
    status: 'resolved',
    createdAt: iso(-6),
    updatedAt: iso(-3),
    lastMessage: 'Your claim was approved and covered in full.',
    satisfactionRating: 5,
  },
];

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    type: 'service',
    title: 'Service due soon',
    body: 'Your Toyota Camry is due for its 45,000 km service in 12 days.',
    createdAt: hoursAgo(2),
    read: false,
    route: '/book-service',
  },
  {
    id: 'n2',
    type: 'recall',
    title: 'Recall notice — Brake booster',
    body: 'A recall affects your vehicle. Book a free inspection at any Elizade centre.',
    createdAt: hoursAgo(20),
    read: false,
    route: '/warranty',
  },
  {
    id: 'n3',
    type: 'ticket',
    title: 'Reply on SUP-3391',
    body: 'Amaka (Sales): We have two units at VI. Would you like to book a test drive?',
    createdAt: hoursAgo(1),
    read: false,
    route: '/ticket/tk1',
  },
  {
    id: 'n4',
    type: 'offer',
    title: 'Year-end service offer',
    body: 'Enjoy 15% off periodic maintenance this month at all Elizade service centres.',
    createdAt: iso(-2),
    read: true,
  },
  {
    id: 'n5',
    type: 'booking',
    title: 'Service in progress',
    body: 'Your Camry service (ELZ) is underway. Track progress in the Service tab.',
    createdAt: iso(-1),
    read: true,
    route: '/service-detail/sa1',
  },
];

export const TICKET_MESSAGES: Record<string, TicketMessage[]> = {
  tk1: [
    { id: 'm1', ticketId: 'tk1', author: 'customer', authorName: 'You', body: 'Hi, is the Land Cruiser 300 VX available? What is the drive-away price?', createdAt: hoursAgo(3) },
    { id: 'm2', ticketId: 'tk1', author: 'agent', authorName: 'Amaka · Sales', body: 'Hello John! Yes — we have two units at our Victoria Island showroom. Drive-away is ₦185,000,000.', createdAt: hoursAgo(2) },
    { id: 'm3', ticketId: 'tk1', author: 'agent', authorName: 'Amaka · Sales', body: 'We have two units at VI. Would you like to book a test drive?', createdAt: hoursAgo(1) },
  ],
  tk2: [
    { id: 'm4', ticketId: 'tk2', author: 'customer', authorName: 'You', body: 'Could you clarify the labour charge on ELZ-8501?', createdAt: hoursAgo(6) },
  ],
  tk3: [
    { id: 'm5', ticketId: 'tk3', author: 'customer', authorName: 'You', body: 'Is my A/C compressor repair covered under warranty?', createdAt: iso(-6) },
    { id: 'm6', ticketId: 'tk3', author: 'agent', authorName: 'Tunde · Warranty', body: 'Your claim was approved and covered in full.', createdAt: iso(-3) },
  ],
};
