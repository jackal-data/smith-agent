import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create salesperson accounts
  const salesPassword = await bcrypt.hash("sales1234", 12);
  const salesperson1 = await prisma.user.upsert({
    where: { email: "alex@smithmotors.com" },
    update: {},
    create: {
      email: "alex@smithmotors.com",
      name: "Alex Rivera",
      password: salesPassword,
      role: "SALESPERSON",
    },
  });

  const salesperson2 = await prisma.user.upsert({
    where: { email: "morgan@smithmotors.com" },
    update: {},
    create: {
      email: "morgan@smithmotors.com",
      name: "Morgan Chen",
      password: salesPassword,
      role: "SALESPERSON",
    },
  });

  // Create manager
  await prisma.user.upsert({
    where: { email: "manager@smithmotors.com" },
    update: {},
    create: {
      email: "manager@smithmotors.com",
      name: "Sam Manager",
      password: salesPassword,
      role: "MANAGER",
    },
  });

  // Create demo customer
  const customerPassword = await bcrypt.hash("customer123", 12);
  await prisma.user.upsert({
    where: { email: "demo@customer.com" },
    update: {},
    create: {
      email: "demo@customer.com",
      name: "Demo Customer",
      password: customerPassword,
      role: "CUSTOMER",
    },
  });

  // Seed vehicles
  const vehicles = [
    {
      vin: "1HGCM82633A123456",
      make: "Honda",
      model: "CR-V",
      year: 2024,
      trim: "EX-L AWD",
      color: "Lunar Silver",
      msrp: 37500,
      mileage: 5,
      daysOnLot: 12,
      features: JSON.stringify(["AWD", "Sunroof", "Heated Seats", "Apple CarPlay", "Lane Keeping Assist", "Adaptive Cruise"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "1HGCM82633A123457",
      make: "Honda",
      model: "CR-V",
      year: 2024,
      trim: "Sport Hybrid",
      color: "Sonic Gray Pearl",
      msrp: 41000,
      mileage: 3,
      daysOnLot: 8,
      features: JSON.stringify(["Hybrid", "AWD", "10.2\" Display", "Heated Seats", "Remote Start", "360 Camera"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "1FTFW1ET5EKF12345",
      make: "Ford",
      model: "F-150",
      year: 2023,
      trim: "XLT SuperCrew 4x4",
      color: "Atlas Blue",
      msrp: 48500,
      mileage: 8200,
      daysOnLot: 45,
      features: JSON.stringify(["4x4", "8-foot Bed", "Tow Package", "SYNC 4", "Pro Power Onboard", "Ford Co-Pilot360"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "1FTFW1ET5EKF12346",
      make: "Ford",
      model: "Bronco",
      year: 2024,
      trim: "Outer Banks 4-Door",
      color: "Area 51",
      msrp: 52000,
      mileage: 120,
      daysOnLot: 6,
      features: JSON.stringify(["4x4", "Removable Top", "Marine-Grade Interior", "SYNC 4A", "Trail Control", "360 Camera"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "5YJ3E1EA8LF123456",
      make: "Tesla",
      model: "Model 3",
      year: 2023,
      trim: "Long Range AWD",
      color: "Midnight Silver",
      msrp: 45990,
      mileage: 1200,
      daysOnLot: 22,
      features: JSON.stringify(["Electric", "AWD", "358mi Range", "Autopilot", "15\" Display", "Premium Audio", "Heated Seats"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "1N4BL4EV8LC123456",
      make: "Nissan",
      model: "Altima",
      year: 2024,
      trim: "SV AWD",
      color: "Pearl White",
      msrp: 29800,
      mileage: 50,
      daysOnLot: 31,
      features: JSON.stringify(["AWD", "ProPilot Assist", "Apple CarPlay", "Heated Seats", "Blind Spot Warning", "Wireless Charging"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "JTEBU5JR8L5123456",
      make: "Toyota",
      model: "4Runner",
      year: 2023,
      trim: "TRD Off-Road 4WD",
      color: "Midnight Black",
      msrp: 42500,
      mileage: 3400,
      daysOnLot: 67,
      features: JSON.stringify(["4WD", "Multi-Terrain Select", "Crawl Control", "Running Boards", "Roof Rack", "8\" Display"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "KMHD84LFXMU123456",
      make: "Hyundai",
      model: "Elantra",
      year: 2024,
      trim: "SEL",
      color: "Cyber Gray",
      msrp: 24500,
      mileage: 20,
      daysOnLot: 14,
      features: JSON.stringify(["10.25\" Display", "Wireless CarPlay", "Lane Following Assist", "Smart Cruise Control", "Heated Seats"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "WBA3A5C50DF123456",
      make: "BMW",
      model: "3 Series",
      year: 2023,
      trim: "330i xDrive",
      color: "Alpine White",
      msrp: 52000,
      mileage: 5600,
      daysOnLot: 41,
      features: JSON.stringify(["xDrive AWD", "Sport Package", "Harman Kardon Audio", "Heads-Up Display", "Park Assist", "Live Cockpit Pro"]),
      imageUrls: JSON.stringify([]),
    },
    {
      vin: "2GNAXHEV4L6123456",
      make: "Chevrolet",
      model: "Equinox",
      year: 2024,
      trim: "LT AWD",
      color: "Red Hot",
      msrp: 32000,
      mileage: 35,
      daysOnLot: 19,
      features: JSON.stringify(["AWD", "Chevy Safety Assist", "MyLink Display", "Heated Seats", "Remote Start", "Wireless Charging"]),
      imageUrls: JSON.stringify([]),
    },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { vin: v.vin },
      update: {},
      create: v,
    });
  }

  console.log(`Seeded ${vehicles.length} vehicles`);
  console.log(`Seeded users: alex@smithmotors.com, morgan@smithmotors.com, manager@smithmotors.com, demo@customer.com`);
  console.log(`Default password for all accounts: sales1234 (salesperson) / customer123 (customer)`);
  console.log(`Salesperson registration key: smith-sales-2024`);

  await prisma.$disconnect();
}

main().catch(console.error);
