import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// ─── Deterministic seed so results are reproducible ──────────────
faker.seed(42);

// ─── Image mapping ────────────────────────────────────────────────

const ALL_IMAGES = [
  "/images/vehicles/crv.jpg",
  "/images/vehicles/crv2.jpg",
  "/images/vehicles/accord.jpg",
  "/images/vehicles/civic.jpg",
  "/images/vehicles/maverick.jpg",
  "/images/vehicles/model3.jpg",
  "/images/vehicles/altima.webp",
  "/images/vehicles/rouge.jpg",
  "/images/vehicles/frontier.jpg",
  "/images/vehicles/4runner.jpg",
  "/images/vehicles/elantra.webp",
  "/images/vehicles/tuscon.jpg",
  "/images/vehicles/equinox.jpg",
  "/images/vehicles/outback.webp",
];

const NATURAL_MAP: Record<string, string[]> = {
  "honda_cr-v":        ["/images/vehicles/crv.jpg", "/images/vehicles/crv2.jpg"],
  "honda_accord":      ["/images/vehicles/accord.jpg"],
  "honda_civic":       ["/images/vehicles/civic.jpg"],
  "ford_maverick":     ["/images/vehicles/maverick.jpg"],
  "tesla_model 3":     ["/images/vehicles/model3.jpg"],
  "nissan_altima":     ["/images/vehicles/altima.webp"],
  "nissan_rogue":      ["/images/vehicles/rouge.jpg"],
  "nissan_frontier":   ["/images/vehicles/frontier.jpg"],
  "toyota_4runner":    ["/images/vehicles/4runner.jpg"],
  "hyundai_elantra":   ["/images/vehicles/elantra.webp"],
  "hyundai_tucson":    ["/images/vehicles/tuscon.jpg"],
  "chevrolet_equinox": ["/images/vehicles/equinox.jpg"],
  "subaru_outback":    ["/images/vehicles/outback.webp"],
};

function getVehicleImages(make: string, model: string): string[] {
  const key = `${make.toLowerCase()}_${model.toLowerCase()}`;
  if (NATURAL_MAP[key]) return NATURAL_MAP[key];
  // deterministic fallback based on key string so same vehicle always gets same image
  const idx = key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % ALL_IMAGES.length;
  return [ALL_IMAGES[idx]];
}

// ─── Vehicle catalogue ────────────────────────────────────────────

const VEHICLE_CATALOGUE = [
  // Honda
  { make: "Honda", model: "CR-V",    year: 2024, trim: "EX-L AWD",           color: "Lunar Silver",      msrp: 37500, features: ["AWD","Sunroof","Heated Seats","Apple CarPlay","Lane Keeping Assist","Adaptive Cruise"] },
  { make: "Honda", model: "CR-V",    year: 2024, trim: "Sport Hybrid",        color: "Sonic Gray Pearl",  msrp: 41000, features: ["Hybrid","AWD","10.2\" Display","Heated Seats","Remote Start","360 Camera"] },
  { make: "Honda", model: "Pilot",   year: 2024, trim: "TrailSport AWD",      color: "Radiant Red",       msrp: 49800, features: ["AWD","3rd Row","Hands-Free Power Tailgate","Apple CarPlay","Honda Sensing","9-Speed Auto"] },
  { make: "Honda", model: "Accord",  year: 2024, trim: "Sport Hybrid",        color: "Meteoroid Gray",    msrp: 33400, features: ["Hybrid","LaneWatch","12.3\" Display","Wireless CarPlay","Heated Seats","Adaptive Cruise"] },
  { make: "Honda", model: "Civic",   year: 2024, trim: "Si Sedan",            color: "Boost Blue Pearl",  msrp: 27700, features: ["Sport Seats","6-Speed Manual","Brembo Brakes","18\" Wheels","10.2\" Display","Honda Sensing"] },
  // Ford
  { make: "Ford",  model: "F-150",   year: 2023, trim: "XLT SuperCrew 4x4",  color: "Atlas Blue",        msrp: 48500, features: ["4x4","8-foot Bed","Tow Package","SYNC 4","Pro Power Onboard","Ford Co-Pilot360"] },
  { make: "Ford",  model: "Bronco",  year: 2024, trim: "Outer Banks 4-Door", color: "Area 51",            msrp: 52000, features: ["4x4","Removable Top","Marine-Grade Interior","SYNC 4A","Trail Control","360 Camera"] },
  { make: "Ford",  model: "Explorer",year: 2024, trim: "ST-Line 4WD",        color: "Carbonized Gray",   msrp: 46500, features: ["4WD","3rd Row","ST-Line Appearance","Ford Co-Pilot360","SYNC 4A","Heated Seats"] },
  { make: "Ford",  model: "Maverick",year: 2024, trim: "XLT Hybrid FWD",     color: "Oxford White",      msrp: 26500, features: ["Hybrid","Ford Co-Pilot360","SYNC 4","Apple CarPlay","FordPass Connect","Tow Package"] },
  { make: "Ford",  model: "Mustang", year: 2024, trim: "GT Premium Fastback", color: "Eruption Green",   msrp: 47800, features: ["5.0L V8","Active Exhaust","MagneRide","B&O Audio","10-Speed Auto","12.4\" Cluster"] },
  // Tesla
  { make: "Tesla", model: "Model 3", year: 2023, trim: "Long Range AWD",     color: "Midnight Silver",   msrp: 45990, features: ["Electric","AWD","358mi Range","Autopilot","15\" Display","Premium Audio","Heated Seats"] },
  { make: "Tesla", model: "Model Y", year: 2024, trim: "Long Range AWD",     color: "Pearl White",       msrp: 52490, features: ["Electric","AWD","330mi Range","Autopilot","Full Self-Driving Capability","7-Seat"] },
  { make: "Tesla", model: "Model S", year: 2023, trim: "Plaid",              color: "Obsidian Black",    msrp: 108990,features: ["Electric","AWD","Tri-Motor","396mi Range","Yoke Steering","17\" Display","Ludicrous Mode"] },
  // Nissan
  { make: "Nissan",model: "Altima",  year: 2024, trim: "SV AWD",             color: "Pearl White",       msrp: 29800, features: ["AWD","ProPilot Assist","Apple CarPlay","Heated Seats","Blind Spot Warning","Wireless Charging"] },
  { make: "Nissan",model: "Rogue",   year: 2024, trim: "SL AWD",             color: "Champagne Silver",  msrp: 36400, features: ["AWD","ProPilot Assist 2.0","Bose Audio","Tri-Zone Climate","12.3\" Display","360 Camera"] },
  { make: "Nissan",model: "Frontier",year: 2023, trim: "PRO-4X 4x4",        color: "Gun Metallic",      msrp: 41200, features: ["4x4","Off-Road Suspension","Locking Rear Diff","8\" Infotainment","Wireless CarPlay","Bed Liner"] },
  // Toyota
  { make: "Toyota",model: "4Runner", year: 2023, trim: "TRD Off-Road 4WD",  color: "Midnight Black",    msrp: 42500, features: ["4WD","Multi-Terrain Select","Crawl Control","Running Boards","Roof Rack","8\" Display"] },
  { make: "Toyota",model: "Camry",   year: 2024, trim: "XSE V6",            color: "Midnight Black",    msrp: 33900, features: ["V6","Sport-Tuned Suspension","Wireless CarPlay","JBL Audio","8\" Display","Adaptive Cruise"] },
  { make: "Toyota",model: "Tacoma",  year: 2024, trim: "TRD Pro 4x4",       color: "Electric Lime",     msrp: 54700, features: ["4x4","Fox Shocks","Skid Plates","14\" Display","360 Camera","Wireless CarPlay","Locking Rear Diff"] },
  { make: "Toyota",model: "RAV4",    year: 2024, trim: "TRD Off-Road AWD",  color: "Cavalry Blue",      msrp: 38800, features: ["AWD","Multi-Terrain Select","All-Terrain Tires","Roof Rails","10.5\" Display","Toyota Safety Sense"] },
  // Hyundai
  { make: "Hyundai",model: "Elantra",year: 2024, trim: "SEL",               color: "Cyber Gray",        msrp: 24500, features: ["10.25\" Display","Wireless CarPlay","Lane Following Assist","Smart Cruise Control","Heated Seats"] },
  { make: "Hyundai",model: "Tucson", year: 2024, trim: "N Line AWD",        color: "Atlas White",       msrp: 34700, features: ["AWD","N Line Sport","Bose Audio","Panoramic Sunroof","Heated/Ventilated Seats","Blind Spot Collision Avoidance"] },
  { make: "Hyundai",model: "Ioniq 5",year: 2024, trim: "Limited AWD",       color: "Digital Teal",      msrp: 55400, features: ["Electric","AWD","266mi Range","Vehicle-to-Load","Augmented Reality HUD","Relaxation Seats"] },
  // BMW
  { make: "BMW",   model: "3 Series",year: 2023, trim: "330i xDrive",       color: "Alpine White",      msrp: 52000, features: ["xDrive AWD","Sport Package","Harman Kardon Audio","Heads-Up Display","Park Assist","Live Cockpit Pro"] },
  { make: "BMW",   model: "X5",      year: 2024, trim: "xDrive40i",         color: "Brooklyn Grey",     msrp: 71500, features: ["xDrive AWD","4-Zone Climate","Panoramic Roof","Driving Assist Pro","Gesture Control","Bowers & Wilkins Audio"] },
  // Chevrolet
  { make: "Chevrolet",model: "Equinox",  year: 2024, trim: "LT AWD",            color: "Red Hot",              msrp: 32000, features: ["AWD","Chevy Safety Assist","MyLink Display","Heated Seats","Remote Start","Wireless Charging"] },
  { make: "Chevrolet",model: "Silverado",year: 2024, trim: "LT Trail Boss 4x4", color: "Northsky Blue",        msrp: 57500, features: ["4x4","2\" Lift","Multi-Flex Tailgate","Duramax Diesel","Super Cruise","14\" Display"] },
  { make: "Chevrolet",model: "Colorado", year: 2024, trim: "ZR2 4x4",           color: "Radiant Red Tintcoat", msrp: 48200, features: ["4x4","Multimatic DSSV Shocks","Locking Diffs","32\" AT Tires","Bose Audio","Off-Road Camera"] },
  // Subaru
  { make: "Subaru",model: "Outback", year: 2024, trim: "Wilderness",        color: "Geyser Blue",       msrp: 39300, features: ["AWD","2.4\" Ground Clearance","All-Terrain Tires","11.6\" Display","EyeSight","X-Mode"] },
  { make: "Subaru",model: "WRX",     year: 2024, trim: "TR",                color: "WR Blue Pearl",     msrp: 34200, features: ["AWD","2.4L Turbo","Brembo Brakes","Recaro Seats","12\" Display","STI Pedals"] },
  // Jeep
  { make: "Jeep",  model: "Wrangler",     year: 2024, trim: "Rubicon 4xe",              color: "Hydro Blue",  msrp: 62800, features: ["4x4","Plug-In Hybrid","Sway Bar Disconnect","Rock-Trac 4WD","12\" Uconnect","Sky One-Touch Top"] },
  { make: "Jeep",  model: "Grand Cherokee",year: 2024, trim: "Summit Reserve 4xe",      color: "Velvet Red",  msrp: 73400, features: ["PHEV","Quadra-Drive II","McIntosh Audio","Digital Rearview Mirror","Night Vision","Air Suspension"] },
  // Kia
  { make: "Kia",   model: "Telluride",year: 2024, trim: "SX-Prestige X-Line", color: "Everlasting Silver", msrp: 54800, features: ["AWD","3rd Row","Meridian Audio","Nappa Leather","Heads-Up Display","Highway Driving Assist 2"] },
  { make: "Kia",   model: "EV6",      year: 2024, trim: "GT-Line AWD",        color: "Runway Red",         msrp: 48300, features: ["Electric","AWD","310mi Range","800V Charging","Augmented Reality HUD","Meridian Audio"] },
  // Porsche
  { make: "Porsche",model: "Cayenne", year: 2024, trim: "S AWD",              color: "Jet Black",          msrp: 89900, features: ["AWD","2.9L Twin-Turbo V6","PASM Sport Suspension","Bose Surround","14-Way Sport Seats","Night Vision"] },
];

// VIN counter for uniqueness
let vinCounter = 1000;
function makeVin(make: string, model: string): string {
  const prefix = (make.slice(0, 1) + model.slice(0, 1)).toUpperCase();
  return `SMITH${prefix}${String(vinCounter++).padStart(7, "0")}`;
}

// ─── Salesperson pool ─────────────────────────────────────────────

const SALESPERSON_POOL = [
  { email: "alex@smithmotors.com",   name: "Alex Rivera",    password: "sales1234" },
  { email: "morgan@smithmotors.com", name: "Morgan Chen",    password: "sales1234" },
  { email: "jordan@smithmotors.com", name: "Jordan Patel",   password: "sales1234" },
  { email: "casey@smithmotors.com",  name: "Casey Williams", password: "sales1234" },
  { email: "riley@smithmotors.com",  name: "Riley Thompson", password: "sales1234" },
];

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...");

  // ── 1. Staff accounts ──────────────────────────────────────────

  const salespersonIds: string[] = [];
  for (const sp of SALESPERSON_POOL) {
    const hashed = await bcrypt.hash(sp.password, 10);
    const user = await prisma.user.upsert({
      where:  { email: sp.email },
      update: {},
      create: { email: sp.email, name: sp.name, password: hashed, role: "SALESPERSON" },
    });
    salespersonIds.push(user.id);
  }

  await prisma.user.upsert({
    where:  { email: "manager@smithmotors.com" },
    update: {},
    create: {
      email:    "manager@smithmotors.com",
      name:     "Sam Manager",
      password: await bcrypt.hash("sales1234", 10),
      role:     "MANAGER",
    },
  });

  console.log(`  ✓ ${SALESPERSON_POOL.length} salespersons + 1 manager`);

  // ── 2. Vehicles ────────────────────────────────────────────────

  const vehicleIds: string[] = [];
  const customerPassword = await bcrypt.hash("customer123", 10);

  for (const spec of VEHICLE_CATALOGUE) {
    const vin = makeVin(spec.make, spec.model);
    // Realistic days-on-lot: mostly fresh, a few aged (>60 days)
    const daysOnLot = faker.helpers.weightedArrayElement([
      { weight: 40, value: () => faker.number.int({ min: 1,  max: 20  }) },
      { weight: 35, value: () => faker.number.int({ min: 21, max: 45  }) },
      { weight: 15, value: () => faker.number.int({ min: 46, max: 65  }) },
      { weight: 10, value: () => faker.number.int({ min: 66, max: 120 }) },
    ])();
    const mileage = faker.number.int({ min: 0, max: 200 });

    const v = await prisma.vehicle.upsert({
      where:  { vin },
      update: {},
      create: {
        vin,
        make:      spec.make,
        model:     spec.model,
        year:      spec.year,
        trim:      spec.trim,
        color:     spec.color,
        msrp:      spec.msrp,
        mileage,
        daysOnLot,
        features:  JSON.stringify(spec.features),
        imageUrls: JSON.stringify(getVehicleImages(spec.make, spec.model)),
        status:    "AVAILABLE",
      },
    });
    vehicleIds.push(v.id);
  }

  // Keep the originals from the first seed run using their well-known VINs
  const LEGACY_VEHICLES = [
    { vin: "1HGCM82633A123456", make: "Honda",     model: "CR-V",     year: 2024, trim: "EX-L AWD",           color: "Lunar Silver",    msrp: 37500, mileage: 5,    daysOnLot: 12, features: ["AWD","Sunroof","Heated Seats","Apple CarPlay","Lane Keeping Assist","Adaptive Cruise"] },
    { vin: "1HGCM82633A123457", make: "Honda",     model: "CR-V",     year: 2024, trim: "Sport Hybrid",        color: "Sonic Gray Pearl",msrp: 41000, mileage: 3,    daysOnLot: 8,  features: ["Hybrid","AWD","10.2\" Display","Heated Seats","Remote Start","360 Camera"] },
    { vin: "1FTFW1ET5EKF12345", make: "Ford",      model: "F-150",    year: 2023, trim: "XLT SuperCrew 4x4",  color: "Atlas Blue",      msrp: 48500, mileage: 8200, daysOnLot: 45, features: ["4x4","8-foot Bed","Tow Package","SYNC 4","Pro Power Onboard","Ford Co-Pilot360"] },
    { vin: "1FTFW1ET5EKF12346", make: "Ford",      model: "Bronco",   year: 2024, trim: "Outer Banks 4-Door", color: "Area 51",         msrp: 52000, mileage: 120,  daysOnLot: 6,  features: ["4x4","Removable Top","Marine-Grade Interior","SYNC 4A","Trail Control","360 Camera"] },
    { vin: "5YJ3E1EA8LF123456", make: "Tesla",     model: "Model 3",  year: 2023, trim: "Long Range AWD",     color: "Midnight Silver", msrp: 45990, mileage: 1200, daysOnLot: 22, features: ["Electric","AWD","358mi Range","Autopilot","15\" Display","Premium Audio","Heated Seats"] },
    { vin: "1N4BL4EV8LC123456", make: "Nissan",    model: "Altima",   year: 2024, trim: "SV AWD",             color: "Pearl White",     msrp: 29800, mileage: 50,   daysOnLot: 31, features: ["AWD","ProPilot Assist","Apple CarPlay","Heated Seats","Blind Spot Warning","Wireless Charging"] },
    { vin: "JTEBU5JR8L5123456", make: "Toyota",    model: "4Runner",  year: 2023, trim: "TRD Off-Road 4WD",  color: "Midnight Black",  msrp: 42500, mileage: 3400, daysOnLot: 67, features: ["4WD","Multi-Terrain Select","Crawl Control","Running Boards","Roof Rack","8\" Display"] },
    { vin: "KMHD84LFXMU123456", make: "Hyundai",   model: "Elantra",  year: 2024, trim: "SEL",               color: "Cyber Gray",      msrp: 24500, mileage: 20,   daysOnLot: 14, features: ["10.25\" Display","Wireless CarPlay","Lane Following Assist","Smart Cruise Control","Heated Seats"] },
    { vin: "WBA3A5C50DF123456", make: "BMW",       model: "3 Series", year: 2023, trim: "330i xDrive",       color: "Alpine White",    msrp: 52000, mileage: 5600, daysOnLot: 41, features: ["xDrive AWD","Sport Package","Harman Kardon Audio","Heads-Up Display","Park Assist","Live Cockpit Pro"] },
    { vin: "2GNAXHEV4L6123456", make: "Chevrolet", model: "Equinox",  year: 2024, trim: "LT AWD",            color: "Red Hot",         msrp: 32000, mileage: 35,   daysOnLot: 19, features: ["AWD","Chevy Safety Assist","MyLink Display","Heated Seats","Remote Start","Wireless Charging"] },
  ];
  for (const v of LEGACY_VEHICLES) {
    const created = await prisma.vehicle.upsert({
      where:  { vin: v.vin },
      update: {},
      create: { ...v, features: JSON.stringify(v.features), imageUrls: JSON.stringify(getVehicleImages(v.make, v.model)), status: "AVAILABLE" },
    });
    if (!vehicleIds.includes(created.id)) vehicleIds.push(created.id);
  }

  console.log(`  ✓ ${vehicleIds.length} vehicles in inventory`);

  // ── 3. Demo customer (keep existing login) ─────────────────────

  const demoCustomer = await prisma.user.upsert({
    where:  { email: "demo@customer.com" },
    update: {},
    create: { email: "demo@customer.com", name: "Demo Customer", password: customerPassword, role: "CUSTOMER" },
  });

  // ── 4. 80 synthetic customers ──────────────────────────────────

  const customerIds: string[] = [demoCustomer.id];

  for (let i = 0; i < 80; i++) {
    const firstName = faker.person.firstName();
    const lastName  = faker.person.lastName();
    const email     = faker.internet.email({ firstName, lastName, provider: "example.com" }).toLowerCase();

    const customer = await prisma.user.upsert({
      where:  { email },
      update: {},
      create: {
        email,
        name:     `${firstName} ${lastName}`,
        phone:    faker.phone.number({ style: "national" }),
        password: customerPassword,
        role:     "CUSTOMER",
      },
    });
    customerIds.push(customer.id);
  }

  console.log(`  ✓ ${customerIds.length} customers`);

  // ── 5. Chat sessions + assignments ────────────────────────────
  //
  // Distribution:
  //   40 ACTIVE        – browsing, no handoff
  //   30 HANDED_OFF    – high intent, pending salesperson
  //   20 CLOSED (won)  – deal closed
  //   10 CLOSED_LOST   – lost
  //   5  ARCHIVED

  type SessionSpec = { status: string; assignmentStatus?: string; intentScore: number };
  const SESSION_SPECS: SessionSpec[] = [
    ...Array.from({ length: 40 }, () => ({ status: "ACTIVE",     intentScore: faker.number.float({ min: 0.05, max: 0.68, fractionDigits: 2 }) })),
    ...Array.from({ length: 30 }, () => ({ status: "HANDED_OFF", assignmentStatus: "PENDING",      intentScore: faker.number.float({ min: 0.72, max: 0.95, fractionDigits: 2 }) })),
    ...Array.from({ length: 10 }, () => ({ status: "HANDED_OFF", assignmentStatus: "IN_PROGRESS",  intentScore: faker.number.float({ min: 0.72, max: 0.90, fractionDigits: 2 }) })),
    ...Array.from({ length: 5  }, () => ({ status: "HANDED_OFF", assignmentStatus: "ACKNOWLEDGED", intentScore: faker.number.float({ min: 0.72, max: 0.88, fractionDigits: 2 }) })),
    ...Array.from({ length: 15 }, () => ({ status: "CLOSED",     assignmentStatus: "CLOSED_WON",   intentScore: faker.number.float({ min: 0.80, max: 1.00, fractionDigits: 2 }) })),
    ...Array.from({ length: 8  }, () => ({ status: "CLOSED",     assignmentStatus: "CLOSED_LOST",  intentScore: faker.number.float({ min: 0.30, max: 0.75, fractionDigits: 2 }) })),
    ...Array.from({ length: 5  }, () => ({ status: "ARCHIVED",   intentScore: faker.number.float({ min: 0.0,  max: 0.40, fractionDigits: 2 }) })),
  ];

  let spIndex = 0;

  for (const spec of SESSION_SPECS) {
    const customerId = faker.helpers.arrayElement(customerIds);
    const vehicle    = faker.helpers.arrayElement(VEHICLE_CATALOGUE);
    const vehicleRec = await prisma.vehicle.findFirst({ where: { make: vehicle.make, model: vehicle.model, status: "AVAILABLE" } });

    const createdAt = faker.date.recent({ days: 90 });
    const handoffAt = spec.status !== "ACTIVE" && spec.status !== "ARCHIVED"
      ? new Date(createdAt.getTime() + faker.number.int({ min: 5, max: 40 }) * 60000)
      : undefined;

    const session = await prisma.chatSession.create({
      data: {
        customerId,
        status:           spec.status,
        intentScore:      spec.intentScore,
        handoffTriggered: spec.status !== "ACTIVE" && spec.status !== "ARCHIVED",
        handoffAt,
        createdAt,
        updatedAt: handoffAt ?? createdAt,
        summary: spec.assignmentStatus
          ? `Customer is interested in a ${vehicle.year} ${vehicle.make} ${vehicle.model}. They have explored ${faker.helpers.arrayElement(["financing", "trade-in options", "available trims"])} and appear ${spec.intentScore > 0.8 ? "highly motivated to buy" : "seriously considering a purchase"}. Recommended next step: schedule a test drive.`
          : undefined,
      },
    });

    // ── Messages ──────────────────────────────────────────────────
    const msgCount = faker.number.int({ min: 4, max: 14 });
    const userLines = [
      `Hi, I'm looking for a ${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
      `What colors are available?`,
      `Does it have AWD?`,
      `What's the MSRP on this one?`,
      `How much would I pay per month if I put $5,000 down?`,
      `Can I schedule a test drive this weekend?`,
      `I have a 2019 Civic I want to trade in.`,
      `How soon can I get this car?`,
      `Is the ${vehicle.trim} still available?`,
      `What financing options do you have?`,
      `Can I speak with someone to negotiate the price?`,
      `I want to buy it. What are the next steps?`,
      `Does it come with a warranty?`,
      `What's the fuel economy on this?`,
    ];
    const assistantLines = [
      `Great choice! The ${vehicle.year} ${vehicle.make} ${vehicle.model} is one of our most popular vehicles.`,
      `It comes in ${vehicle.color} as well as several other options.`,
      `Yes, the ${vehicle.trim} trim includes ${vehicle.features[0]} as a standard feature.`,
      `The MSRP is $${vehicle.msrp.toLocaleString()}.`,
      `With a $5,000 down payment and good credit, you're looking at approximately $${Math.round((vehicle.msrp - 5000) / 60 * 1.06)}/month on a 60-month term.`,
      `Absolutely! I can get you on the schedule for this Saturday or Sunday — what time works best?`,
      `We'd be happy to appraise your trade-in. What's the current mileage?`,
      `We have it in stock and can have it ready within 24 hours of finalizing paperwork.`,
      `It sure is — still available and in excellent condition.`,
      `We work with several lenders and can often beat rates you'd find at a bank.`,
      `Of course! Let me loop in one of our sales advisors who can walk you through pricing in detail.`,
      `That's exciting! The next step is to come in or connect with our team to review the purchase agreement.`,
      `It comes with a 3-year/36,000-mile bumper-to-bumper and 5-year/60,000-mile powertrain warranty.`,
      `EPA estimates around 28 city / 35 highway for the ${vehicle.trim}.`,
    ];

    for (let m = 0; m < msgCount; m++) {
      const msgCreatedAt = new Date(createdAt.getTime() + m * faker.number.int({ min: 30000, max: 180000 }));
      const intentDelta  = m < 4
        ? faker.number.float({ min: 0.01, max: 0.08, fractionDigits: 3 })
        : faker.number.float({ min: 0.05, max: 0.20, fractionDigits: 3 });

      await prisma.message.create({
        data: { sessionId: session.id, role: "USER",      content: userLines[m % userLines.length],         intentDelta, createdAt: msgCreatedAt },
      });
      await prisma.message.create({
        data: { sessionId: session.id, role: "ASSISTANT", content: assistantLines[m % assistantLines.length], createdAt: new Date(msgCreatedAt.getTime() + 3000) },
      });
    }

    // ── Vehicle mention ───────────────────────────────────────────
    if (vehicleRec) {
      await prisma.chatVehicleMention.create({
        data: { sessionId: session.id, vehicleId: vehicleRec.id, mentionedAt: createdAt, sentiment: faker.number.float({ min: 0.4, max: 1.0, fractionDigits: 2 }) },
      });
    }

    // ── ConversionEvent: chat_started ─────────────────────────────
    await prisma.conversionEvent.create({
      data: { sessionId: session.id, customerId, eventType: "chat_started", metadata: JSON.stringify({ make: vehicle.make, model: vehicle.model }), occurredAt: createdAt },
    });

    // ── Assignment + follow-on events ─────────────────────────────
    if (spec.assignmentStatus) {
      const salespersonId  = salespersonIds[spIndex % salespersonIds.length];
      spIndex++;

      const handoffPayload = {
        sessionId:     session.id,
        customerId,
        summary:       session.summary ?? "",
        intentScore:   spec.intentScore,
        vehiclesOfInterest: vehicleRec
          ? [{ vin: vehicleRec.vin, make: vehicle.make, model: vehicle.model, year: vehicle.year, msrp: vehicle.msrp, sentimentScore: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }) }]
          : [],
        financingMentioned:  faker.datatype.boolean(0.6),
        tradeInMentioned:    faker.datatype.boolean(0.3),
        urgencySignals:      faker.helpers.arrayElements(["mentioned this weekend","asked about availability","said needs car before end of month","asked about expedited delivery"], faker.number.int({ min: 0, max: 2 })),
        recommendedNextStep: `Schedule a test drive for the ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        messageCount:        msgCount * 2,
        sessionDurationMinutes: faker.number.int({ min: 5, max: 45 }),
      };

      await prisma.assignment.create({
        data: {
          sessionId:      session.id,
          customerId,
          salespersonId,
          summary:        session.summary ?? "",
          intentScore:    spec.intentScore,
          recommendedMarkup: spec.intentScore > 0.85
            ? faker.number.float({ min: 4.0, max: 6.0, fractionDigits: 1 })
            : spec.intentScore > 0.72
              ? faker.number.float({ min: 2.0, max: 4.0, fractionDigits: 1 })
              : faker.number.float({ min: 0.0, max: 2.0, fractionDigits: 1 }),
          status:         spec.assignmentStatus,
          handoffPayload: JSON.stringify(handoffPayload),
          createdAt:      handoffAt ?? createdAt,
          updatedAt:      handoffAt ?? createdAt,
        },
      });

      await prisma.conversionEvent.create({
        data: { sessionId: session.id, customerId, eventType: "handoff", metadata: JSON.stringify({ salespersonId, intentScore: spec.intentScore }), occurredAt: handoffAt ?? createdAt },
      });

      // Appointment for high-intent / won sessions
      if (["CLOSED_WON","IN_PROGRESS","ACKNOWLEDGED"].includes(spec.assignmentStatus) && vehicleRec) {
        const apptAt = new Date((handoffAt ?? createdAt).getTime() + faker.number.int({ min: 1, max: 5 }) * 86400000);
        const apptStatus = spec.assignmentStatus === "CLOSED_WON"   ? "COMPLETED"
                         : spec.assignmentStatus === "IN_PROGRESS"  ? faker.helpers.arrayElement(["CONFIRMED","SCHEDULED"])
                         : "SCHEDULED";

        await prisma.appointment.create({
          data: {
            sessionId:   session.id,
            customerId,
            vehicleId:   vehicleRec.id,
            type:        "TEST_DRIVE",
            scheduledAt: apptAt,
            status:      apptStatus,
            notes:       `Customer interested in ${vehicle.trim}. ${handoffPayload.tradeInMentioned ? "Has a trade-in to discuss." : "No trade-in."}`,
            createdAt:   handoffAt ?? createdAt,
          },
        });

        await prisma.conversionEvent.create({
          data: { sessionId: session.id, customerId, eventType: "appointment_booked", metadata: JSON.stringify({ type: "TEST_DRIVE", vehicleVin: vehicleRec.vin }), occurredAt: apptAt },
        });
      }

      // Financing application for won / in-progress sessions
      if (["CLOSED_WON","IN_PROGRESS"].includes(spec.assignmentStatus) && handoffPayload.financingMentioned) {
        const annualIncome = faker.number.int({ min: 35000, max: 180000 });
        const downPayment  = faker.number.int({ min: 2000,  max: 15000 });
        const term         = faker.helpers.arrayElement([36, 48, 60, 72]);
        const apr          = spec.assignmentStatus === "CLOSED_WON"
          ? faker.number.float({ min: 2.9, max: 6.9,  fractionDigits: 2 })
          : faker.number.float({ min: 4.9, max: 14.9, fractionDigits: 2 });
        const principal    = vehicle.msrp - downPayment;
        const monthlyRate  = apr / 100 / 12;
        const monthly      = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
        const finStatus    = spec.assignmentStatus === "CLOSED_WON" ? "FUNDED" : "UNDER_REVIEW";

        const app = await prisma.financingApplication.create({
          data: {
            customerId,
            vehicleVin:       vehicleRec?.vin,
            annualIncome,
            creditScoreRange: faker.helpers.arrayElement(["Excellent (750+)","Good (700-749)","Fair (650-699)","Poor (<650)"]),
            downPayment,
            loanTermMonths:   term,
            monthlyPayment:   Math.round(monthly * 100) / 100,
            apr,
            lender:           faker.helpers.arrayElement(["Smith Motors Finance","Chase Auto","Capital One Auto","Wells Fargo Dealer"]),
            status:           finStatus,
          },
        });

        await prisma.conversionEvent.create({
          data: { sessionId: session.id, customerId, eventType: "financing_submitted", metadata: JSON.stringify({ applicationId: app.id }), occurredAt: new Date((handoffAt ?? createdAt).getTime() + 2 * 86400000) },
        });

        for (const dtype of ["DRIVERS_LICENSE","PROOF_OF_INCOME","PROOF_OF_INSURANCE"]) {
          await prisma.document.create({
            data: {
              applicationId: app.id,
              type:          dtype,
              fileName:      `${dtype.toLowerCase().replace(/_/g, "-")}-${faker.string.alphanumeric(6)}.pdf`,
              storageKey:    `uploads/${app.id}/${dtype.toLowerCase()}.pdf`,
              verified:      finStatus === "FUNDED",
            },
          });
        }
      }
    }
  }

  console.log(`  ✓ ${SESSION_SPECS.length} chat sessions with messages, mentions, assignments, appointments, and financing records`);

  // ── 6. Summary ─────────────────────────────────────────────────

  console.log("\nSeed complete!");
  console.log("  Demo accounts:");
  console.log("    demo@customer.com       / customer123  (CUSTOMER)");
  for (const sp of SALESPERSON_POOL) {
    console.log(`    ${sp.email.padEnd(32)} / ${sp.password}  (SALESPERSON)`);
  }
  console.log("    manager@smithmotors.com / sales1234    (MANAGER)");
  console.log("  Salesperson registration key: smith-sales-2024");

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
