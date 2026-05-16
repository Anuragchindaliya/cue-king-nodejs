import * as dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/db';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTime(hoursStr: string): { open: string; close: string } {
  if (hoursStr.toLowerCase().includes("open 24")) {
    return { open: "00:00", close: "23:59" };
  }
  const match = hoursStr.match(/(\d{1,2}:\d{2}\s?[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s?[AP]M)/i);
  if (!match || !match[1] || !match[2]) return { open: "10:00", close: "23:00" };
  
  const to24 = (t: string) => {
    const parts = t.trim().split(/\s/);
    const time = parts[0] || "10:00";
    const meridiem = parts[1] || "AM";
    
    let [hStr, mStr] = time.split(":");
    let h = Number(hStr) || 10;
    let m = Number(mStr) || 0;
    
    if (meridiem.toUpperCase() === "PM" && h !== 12) h += 12;
    if (meridiem.toUpperCase() === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  return { open: to24(match[1]), close: to24(match[2]) };
}

// ─── Raw scraped data ────────────────────────────────────────────────────────

interface RawClub {
  name: string;
  address: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  phone: string | null;
  openingHours: string;
  snookerTables: number | null;
  poolTables: number | null;
  snookerPricePerHour: number;
  poolPricePerHour: number;
  amenities: string[];
}

const clubs: RawClub[] = [
  // ── Delhi ────────────────────────────────────────────────────────────────
  {
    name: "CueDue Snooker Cafe",
    address: "G 72, Jaswant Plaza, Kalindi Kunj Rd, Shaheen Bagh, Okhla, New Delhi, Delhi 110025",
    area: "Shaheen Bagh, Okhla",
    city: "New Delhi",
    lat: 28.5438412,
    lng: 77.3041678,
    rating: 4.7,
    phone: "+91 99902 20197",
    openingHours: "Open 24 hours",
    snookerTables: 7,
    poolTables: 1,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Snacks & Drinks", "VIP Lounge", "Practice Room", "WiFi"],
  },
  {
    name: "Snooker Club 147",
    address: "B-1, 2nd Floor, Neeraj Medical, Bindapur Rd, Sanjay Enclave, Uttam Nagar, Delhi 110059",
    area: "Uttam Nagar",
    city: "New Delhi",
    lat: 28.6145558,
    lng: 77.059240,
    rating: 4.9,
    phone: "+91 96256 20955",
    openingHours: "Open 24 hours",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 200,
    amenities: ["AC", "Food Available", "24/7"],
  },
  {
    name: "Asif Snooker Club",
    address: "H73V+2XR, Part 1 Abul Fazal Enclave, Jamia Nagar, Okhla, New Delhi, Delhi 110025",
    area: "Jamia Nagar, Okhla",
    city: "New Delhi",
    lat: 28.5526245,
    lng: 77.2948866,
    rating: 4.2,
    phone: "+91 96542 48497",
    openingHours: "Open 24 hours",
    snookerTables: 5,
    poolTables: 1,
    snookerPricePerHour: 250,
    poolPricePerHour: 200,
    amenities: ["AC", "Canteen", "WiFi", "Clean Washrooms", "Star Tables"],
  },
  {
    name: "Big Billiards",
    address: "10 Basement, Outer Ring Rd, Pocket GH2, Bhera Enclave, Paschim Vihar, New Delhi, Delhi 110087",
    area: "Paschim Vihar",
    city: "New Delhi",
    lat: 28.6717906,
    lng: 77.0936227,
    rating: 4.9,
    phone: "+91 98716 20491",
    openingHours: "12:00 PM – 4:00 AM",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Food & Drinks", "Premium Ambience"],
  },
  {
    name: "Megapool Snooker Academy",
    address: "224 Dada Dev Tower 2nd Floor, Behind Akash Hospital, Rajapuri Chowk, Dwarka, New Delhi, Delhi 110059",
    area: "Dwarka",
    city: "New Delhi",
    lat: 28.6051139,
    lng: 77.0543445,
    rating: 4.3,
    phone: "+91 78610 00999",
    openingHours: "Open 24 hours",
    snookerTables: 2,
    poolTables: 1,
    snookerPricePerHour: 250,
    poolPricePerHour: 200,
    amenities: ["AC", "Snacks & Coffee", "Coaching", "24/7"],
  },
  {
    name: "Smash Snooker Club and Cafe",
    address: "Block B, Sant Nagar, Burari, Delhi 110084",
    area: "Burari",
    city: "New Delhi",
    lat: 28.739365,
    lng: 77.1978242,
    rating: 5.0,
    phone: null,
    openingHours: "Open 24 hours",
    snookerTables: 3,
    poolTables: 1,
    snookerPricePerHour: 200,
    poolPricePerHour: 150,
    amenities: ["Food & Drinks", "24/7", "Nice Ambience"],
  },
  {
    name: "Sahil Snooker Club",
    address: "TA 208, Guru Ravidas Marg, near Hanuman Mandir, Kalkaji Extension, Kalkaji, New Delhi, Delhi 110019",
    area: "Kalkaji",
    city: "New Delhi",
    lat: 28.52819,
    lng: 77.2578981,
    rating: 5.0,
    phone: "+91 85272 54164",
    openingHours: "Open 24 hours",
    snookerTables: 4,
    poolTables: 1,
    snookerPricePerHour: 250,
    poolPricePerHour: 200,
    amenities: ["AC", "Clean Environment", "Good Lighting", "24/7"],
  },
  {
    name: "Jalwa Billiards & Cafe",
    address: "Building no. 1211, Chah Rahat, Wakilpura Behind Bukhara Hotel, Near Jama Masjid Gate no.3, Chandni Chowk, New Delhi, Delhi 110006",
    area: "Chandni Chowk",
    city: "New Delhi",
    lat: 28.6519902,
    lng: 77.2326675,
    rating: 4.3,
    phone: "+91 99533 69874",
    openingHours: "3:00 PM – 3:00 AM",
    snookerTables: 2,
    poolTables: 1,
    snookerPricePerHour: 225,
    poolPricePerHour: 175,
    amenities: ["Fast Food", "Late Night", "Casual Vibe"],
  },
  {
    name: "8 Balls Gaming Club",
    address: "Second Floor, Kh.No 33/24, opposite True Value Showroom, Pocket 3, Sector 17, Rohini, Delhi 110089",
    area: "Rohini Sector 17",
    city: "New Delhi",
    lat: 28.7435295,
    lng: 77.1215383,
    rating: 5.0,
    phone: null,
    openingHours: "11:00 AM – 11:30 PM",
    snookerTables: 2,
    poolTables: 3,
    snookerPricePerHour: 200,
    poolPricePerHour: 150,
    amenities: ["Snacks", "Family Friendly", "Good Lighting"],
  },
  {
    name: "SnookerWala",
    address: "Lower G. Floor, Sachdeva Corporate Tower, Under South Indian Bank, near BP Petrol Pump, Sector 8, Rohini, Delhi 110085",
    area: "Rohini Sector 8",
    city: "New Delhi",
    lat: 28.7028896,
    lng: 77.1227999,
    rating: 4.8,
    phone: "+91 96542 36476",
    openingHours: "9:30 AM – 5:00 AM",
    snookerTables: 5,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Drinks", "Late Night", "Premium Ambience"],
  },
  {
    name: "Baba Billiards Academy",
    address: "Metro Pillar No. 72, Basement of Senco Gold Jewellers, 4, Bharti Artist Colony Rd, Nirman Vihar, Preet Vihar, Delhi 110092",
    area: "Nirman Vihar, Preet Vihar",
    city: "New Delhi",
    lat: 28.6372339,
    lng: 77.2884082,
    rating: 4.2,
    phone: "+91 98114 25782",
    openingHours: "Open 24 hours",
    snookerTables: 5,
    poolTables: 1,
    snookerPricePerHour: 240,
    poolPricePerHour: 200,
    amenities: ["AC", "Canteen", "Coaching", "24/7"],
  },

  // ── Gurgaon ──────────────────────────────────────────────────────────────
  {
    name: "Sai Pool and Snooker Parlour Club",
    address: "1163p, Sector Main Rd, Block E, Sector 46, Gurugram, Haryana 122003",
    area: "Sector 46",
    city: "Gurugram",
    lat: 28.4376332,
    lng: 77.0584036,
    rating: 4.6,
    phone: "+91 90501 13111",
    openingHours: "Open 24 hours",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "24/7", "Clean Environment"],
  },
  {
    name: "Hall Of Frames – Snooker and Pool Club",
    address: "Basement, Plot No-107, near Metro Station Phase 1, Sector 28, Chakkarpur, Gurugram, Haryana 122009",
    area: "Sector 28, Chakkarpur",
    city: "Gurugram",
    lat: 28.4699426,
    lng: 77.0923865,
    rating: 4.7,
    phone: "+91 85950 26461",
    openingHours: "Open 24 hours",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "24/7", "Family Friendly", "Premium Tables"],
  },
  {
    name: "Pockets Snooker Club",
    address: "Sco 1, Dayal Market, Urban Estate, Gurgaon Rural, Gurugram, Haryana 122001",
    area: "Gurgaon Rural",
    city: "Gurugram",
    lat: 28.4699247,
    lng: 77.0143518,
    rating: 4.9,
    phone: "+91 98719 10410",
    openingHours: "Open 24 hours",
    snookerTables: 5,
    poolTables: 2,
    snookerPricePerHour: 350,
    poolPricePerHour: 250,
    amenities: ["AC", "24/7", "Professional Tables", "Clean Premises"],
  },
  {
    name: "7/11 Billiards & Lounge",
    address: "240, Sector Rd, Sector 51, Gurugram, Haryana 122018",
    area: "Sector 51",
    city: "Gurugram",
    lat: 28.433732,
    lng: 77.066155,
    rating: 4.6,
    phone: "+91 92054 35583",
    openingHours: "12:00 PM – 5:00 AM",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Canteen", "PS5", "Table Tennis", "Late Night"],
  },
  {
    name: "Anytime Snooker Club and Cafe",
    address: "City Emporio, New Colony More, Old Railway Rd, near Raj Mahal Hotel, Sector 7, Gurugram, Haryana 122001",
    area: "Sector 7",
    city: "Gurugram",
    lat: 28.4671103,
    lng: 77.0206523,
    rating: 5.0,
    phone: "+91 88004 37147",
    openingHours: "Open 24 hours",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 150,
    amenities: ["AC", "24/7", "Coaching", "Budget Friendly"],
  },
  {
    name: "Golden Break Snooker Club",
    address: "42, U-12 Rd, U Block, DLF Phase 3, Sector 24, Gurugram, Haryana 122002",
    area: "DLF Phase 3, Sector 24",
    city: "Gurugram",
    lat: 28.4941161,
    lng: 77.0947763,
    rating: 4.5,
    phone: "+91 88001 82869",
    openingHours: "Open 24 hours",
    snookerTables: 2,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "24/7", "Music", "Late Night"],
  },

  // ── Noida ─────────────────────────────────────────────────────────────────
  {
    name: "Cue Club",
    address: "AMALTASH MARG, plot no 4, above Citizen Co-op Bank, Sector 22, Noida, Uttar Pradesh 201307",
    area: "Sector 22",
    city: "Noida",
    lat: 28.5946609,
    lng: 77.3426279,
    rating: 3.8,
    phone: "+91 98912 77774",
    openingHours: "Open 24 hours",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 150,
    poolPricePerHour: 100,
    amenities: ["Big Screen TV", "24/7", "Female Friendly"],
  },
  {
    name: "The Snooker Central",
    address: "4th Floor, CMC Complex, M 7, Dadri Main Rd, Sector 49, Noida, Uttar Pradesh 201304",
    area: "Sector 49",
    city: "Noida",
    lat: 28.5606138,
    lng: 77.3691485,
    rating: 4.7,
    phone: "+91 88605 77577",
    openingHours: "11:00 AM – 11:00 PM",
    snookerTables: 5,
    poolTables: 2,
    snookerPricePerHour: 330,
    poolPricePerHour: 250,
    amenities: ["AC", "Food Menu", "Premium Tables", "Sports Equipment Shop"],
  },
  {
    name: "House of Billiards",
    address: "Gate no 2, SD-09 Basement, near Sector 116 Main Road, Sector 116, Noida, Uttar Pradesh 201309",
    area: "Sector 116",
    city: "Noida",
    lat: 28.5687776,
    lng: 77.3952236,
    rating: 4.8,
    phone: "+91 99600 35617",
    openingHours: "11:00 AM – 11:00 PM",
    snookerTables: 6,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Coaching", "Food", "Professional Tables"],
  },
  {
    name: "The Hangout Club",
    address: "Bus Stand, I-20, Block I, Sector 22, Noida, Uttar Pradesh 201307",
    area: "Sector 22",
    city: "Noida",
    lat: 28.5986156,
    lng: 77.3449455,
    rating: 4.1,
    phone: "+91 98710 34492",
    openingHours: "10:00 AM – 10:00 PM",
    snookerTables: 6,
    poolTables: 4,
    snookerPricePerHour: 220,
    poolPricePerHour: 150,
    amenities: ["AC", "Smoking Zone", "Multiple Tables", "Parking"],
  },
  {
    name: "The Snook",
    address: "3rd Floor, Ashirwad Complex, Ghijore, Sector 53, Noida, Uttar Pradesh 201307",
    area: "Sector 53",
    city: "Noida",
    lat: 28.586531,
    lng: 77.3632212,
    rating: 4.3,
    phone: "+91 96546 03906",
    openingHours: "11:00 AM – 1:00 AM",
    snookerTables: 2,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["Snacks", "Parking", "Late Night"],
  },

  // ── Greater Noida ─────────────────────────────────────────────────────────
  {
    name: "6 Flags Snooker Club & Restaurant",
    address: "3/1B, Knowledge Park III, Greater Noida, Uttar Pradesh 201308",
    area: "Knowledge Park III",
    city: "Greater Noida",
    lat: 28.4770707,
    lng: 77.4914632,
    rating: 4.7,
    phone: "+91 99990 80337",
    openingHours: "10:00 AM – 1:00 AM",
    snookerTables: 6,
    poolTables: 2,
    snookerPricePerHour: 350,
    poolPricePerHour: 250,
    amenities: ["Restaurant", "AC", "PS5", "Foosball", "Outdoor Seating", "Bonfire in Winter", "Coaching"],
  },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎱 Seeding Delhi NCR snooker & pool clubs…\n");

  // Create a dummy owner to associate all seeded clubs with
  const owner = await prisma.user.upsert({
    where: { email: 'seedowner@cueking.com' },
    update: {},
    create: {
      email: 'seedowner@cueking.com',
      name: 'Seed Master Owner',
      role: 'CLUB_OWNER',
    }
  });

  const OWNER_ID = owner.id;
  console.log(`👤 Assigned Owner: ${OWNER_ID}`);

  for (const raw of clubs) {
    const { open, close } = parseTime(raw.openingHours);

    // 1. Upsert Location
    const existingLoc = await prisma.location.findFirst({
      where: { city: raw.city, area: raw.area },
    });
    
    const locationId = existingLoc
      ? existingLoc.id
      : (await prisma.location.create({ data: { city: raw.city, area: raw.area } })).id;

    // 2. Upsert Club
    const existingClub = await prisma.club.findFirst({
      where: { name: raw.name, locationId },
    });

    let clubId: string;
    if (existingClub) {
      clubId = existingClub.id;
      await prisma.club.update({
        where: { id: clubId },
        data: {
          rating: raw.rating,
          fullAddress: raw.address,
          lat: raw.lat,
          lng: raw.lng,
          openingTime: open,
          closingTime: close,
          amenities: raw.amenities,
        },
      });
      console.log(`  ♻️  Updated  : ${raw.name}`);
    } else {
      const club = await prisma.club.create({
        data: {
          name: raw.name,
          fullAddress: raw.address,
          rating: raw.rating,
          lat: raw.lat,
          lng: raw.lng,
          openingTime: open,
          closingTime: close,
          amenities: raw.amenities,
          ownerId: OWNER_ID,
          locationId,
        },
      });
      clubId = club.id;
      console.log(`  ✅  Created  : ${raw.name}`);
    }

    // 3. Seed TableCategories
    const categories: { name: string; quantity: number; pricePerHour: number }[] = [];

    if (raw.snookerTables && raw.snookerTables > 0) {
      categories.push({
        name: "Snooker Table",
        quantity: raw.snookerTables,
        pricePerHour: raw.snookerPricePerHour,
      });
    }
    if (raw.poolTables && raw.poolTables > 0) {
      categories.push({
        name: "8 Ball Pool Table",
        quantity: raw.poolTables,
        pricePerHour: raw.poolPricePerHour,
      });
    }

    for (const cat of categories) {
      const existing = await prisma.tableCategory.findFirst({
        where: { clubId, name: cat.name },
      });
      if (!existing) {
        await prisma.tableCategory.create({
          data: { ...cat, clubId },
        });
      } else {
        await prisma.tableCategory.update({
          where: { id: existing.id },
          data: { quantity: cat.quantity, pricePerHour: cat.pricePerHour },
        });
      }
    }
  }

  console.log(`\n🎉 Done! ${clubs.length} clubs seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    // @ts-ignore
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
