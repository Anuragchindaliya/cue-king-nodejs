import * as dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/config/db';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTime(hoursStr: string): { open: string; close: string } {
  if (hoursStr.toLowerCase().includes("open 24")) {
    return { open: "00:00", close: "23:59" };
  }
  const match = hoursStr.match(/(\d{1,2}:\d{2}\s?[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s?[AP]M)/i);
  if (!match) return { open: "10:00", close: "23:00" };
  const to24 = (t: string) => {
    const [time, meridiem] = t.trim().split(/\s/);
    if(!time || !meridiem) return "00:00";
    let [h, m] = time.split(":").map(Number);
    if(!h || !m) return "00:00";
    if (meridiem.toUpperCase() === "PM" && h !== 12) h += 12;
    if (meridiem.toUpperCase() === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  if(!match[1] || !match[2]) return { open: "00:00", close: "23:59" };
  return { open: to24(match[1]), close: to24(match[2]) };
}

// ─── Types ───────────────────────────────────────────────────────────────────

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
  snookerTables: number;
  poolTables: number;
  snookerPricePerHour: number;
  poolPricePerHour: number;
  amenities: string[];
}

// ─── New clubs: Faridabad + additional New Delhi areas ───────────────────────

// owner ID will be fetched dynamically in main()

const clubs: RawClub[] = [

  // ══════════════════════════════════════════════════════════════
  //  FARIDABAD
  // ══════════════════════════════════════════════════════════════

  {
    name: "Pool World",
    address: "101, Basement, NH-5, Railway Rd, CBI Colony, New Industrial Township, Faridabad, Haryana 121001",
    area: "New Industrial Township",
    city: "Faridabad",
    lat: 28.4030617,
    lng: 77.3059426,
    rating: 4.9,
    phone: null,
    openingHours: "10:00 AM – 6:00 AM",
    snookerTables: 4,
    poolTables: 3,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["Food & Drinks", "Late Night", "Snacks", "Cigarettes at MRP"],
  },
  {
    name: "The Cue Casa",
    address: "Bake Mart Basement, near Bansal Dhaba, Huda Market, Inder Colony, Sector 31, Faridabad, Haryana 121003",
    area: "Sector 31",
    city: "Faridabad",
    lat: 28.4459462,
    lng: 77.3171139,
    rating: 4.8,
    phone: "+91 81309 81542",
    openingHours: "Open 24 hours",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["AC", "24/7", "Food", "Female Friendly", "Safe Environment"],
  },
  {
    name: "The Cue's Snooker Room",
    address: "2n 74, Block N, New Industrial Twp 2, New Industrial Township, Faridabad, Haryana 121001",
    area: "New Industrial Township 2",
    city: "Faridabad",
    lat: 28.3893151,
    lng: 77.2898539,
    rating: 4.5,
    phone: "+91 78278 78787",
    openingHours: "Open 24 hours",
    snookerTables: 3,
    poolTables: 3,
    snookerPricePerHour: 180,
    poolPricePerHour: 100,
    amenities: ["24/7", "Budget Friendly", "Large Capacity"],
  },
  {
    name: "The Green Room – Snooker and Pool Club",
    address: "Plot no. 25, 88 Dividing Road, opposite Chandiwala Bagh, Sector 87, Neharpar Faridabad, Haryana 121002",
    area: "Sector 87, Neharpar",
    city: "Faridabad",
    lat: 28.4192702,
    lng: 77.3499737,
    rating: 5.0,
    phone: "+91 83739 38384",
    openingHours: "11:00 AM – 10:00 PM",
    snookerTables: 3,
    poolTables: 1,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["Premium Tables", "Clean Environment", "Good Ambience"],
  },
  {
    name: "DoubleBlack Snooker Club",
    address: "Anshu Properties Basement, A-1870, Mall Rd, opposite Bikaner House, Greenfield Colony, Sector 43, Faridabad, Haryana 121010",
    area: "Sector 43, Greenfield Colony",
    city: "Faridabad",
    lat: 28.4623885,
    lng: 77.2981527,
    rating: 4.9,
    phone: null,
    openingHours: "Open 24 hours",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 280,
    poolPricePerHour: 200,
    amenities: ["AC", "24/7", "Café", "New Quality Tables", "Outside Food Allowed"],
  },
  {
    name: "Sticks & Balls Snooker and Pool Club",
    address: "Chandila Chowk, Bathola, Bhataula Village, Sector 82, Faridabad, Haryana 121007",
    area: "Sector 82, Bhataula",
    city: "Faridabad",
    lat: 28.3883577,
    lng: 77.3604835,
    rating: 4.8,
    phone: "+91 79060 98211",
    openingHours: "11:00 AM – 12:00 AM",
    snookerTables: 4,
    poolTables: 3,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["World Class Tables", "Water & Cold Drinks", "Spacious"],
  },
  {
    name: "AK147",
    address: "130, Basement, Sector 21C, Faridabad, Haryana 121003",
    area: "Sector 21C",
    city: "Faridabad",
    lat: 28.4319922,
    lng: 77.2968531,
    rating: 5.0,
    phone: null,
    openingHours: "10:00 AM – 11:00 PM",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["AC", "Music", "Clean", "Friendly Staff"],
  },
  {
    name: "Planet Pool & Snooker",
    address: "Plot No. 87, Sapna Market, 12/2, Sarai Khawaja Village, Sector 37, Faridabad, Haryana 121003",
    area: "Sector 37",
    city: "Faridabad",
    lat: 28.480961,
    lng: 77.3061268,
    rating: 4.6,
    phone: "+91 93157 63370",
    openingHours: "Open 24 hours",
    snookerTables: 2,
    poolTables: 2,
    snookerPricePerHour: 200,
    poolPricePerHour: 150,
    amenities: ["24/7"],
  },

  // ══════════════════════════════════════════════════════════════
  //  NEW DELHI – Central / South / East / North (new areas)
  // ══════════════════════════════════════════════════════════════

  {
    name: "Q Balls",
    address: "Kumaharan Gali, Main Bazar, Aram Bagh, Paharganj, New Delhi, Delhi 110055",
    area: "Paharganj",
    city: "New Delhi",
    lat: 28.641618,
    lng: 77.2156585,
    rating: 4.3,
    phone: null,
    openingHours: "11:00 AM – 12:00 AM",
    snookerTables: 2,
    poolTables: 1,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["Canteen", "Tea & Coffee", "Friendly Owner"],
  },
  {
    name: "M Snooker and Pool Lounge",
    address: "51/2, Old Rajinder Nagar, Block 51, Rajinder Nagar, New Delhi, Delhi 110060",
    area: "Rajinder Nagar",
    city: "New Delhi",
    lat: 28.641483,
    lng: 77.1880116,
    rating: 4.5,
    phone: "+91 99996 00082",
    openingHours: "11:00 AM – 10:00 PM",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Premium S1 Tables", "Heated Tables", "Good Ambience"],
  },
  {
    name: "Delhi Snooker Club",
    address: "Block D, Krishna Nagar, Delhi 110051",
    area: "Krishna Nagar",
    city: "New Delhi",
    lat: 28.6600357,
    lng: 77.2810453,
    rating: 4.8,
    phone: "+91 70421 78366",
    openingHours: "Open 24 hours",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 280,
    poolPricePerHour: 200,
    amenities: ["AC", "24/7", "Luxury Tables", "Good Food", "Classy Ambience"],
  },
  {
    name: "CUE TIP Snooker and Pool Academy",
    address: "Basement, B-224, Dr Ramlal Verma Marg, Block B, Lajpat Nagar I, New Delhi, Delhi 110024",
    area: "Lajpat Nagar",
    city: "New Delhi",
    lat: 28.5756903,
    lng: 77.2413901,
    rating: 4.6,
    phone: "+91 11 4107 4426",
    openingHours: "9:00 AM – 11:00 PM",
    snookerTables: 3,
    poolTables: 4,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Food & Pizza", "Coaching", "Chicken Momos"],
  },
  {
    name: "Cue Masterz Snooker & Pool Center",
    address: "2nd Floor, Gupta Building, 9062, Ram Bagh Rd, Azad Market, Tis Hazari, New Delhi, Delhi 110006",
    area: "Azad Market, Tis Hazari",
    city: "New Delhi",
    lat: 28.6654997,
    lng: 77.2052398,
    rating: 4.5,
    phone: "+91 87448 75701",
    openingHours: "5:00 PM – 5:00 AM",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["Late Night", "Good Hospitality"],
  },
  {
    name: "THE CUE WORLD",
    address: "Basement, Backside of NHI Hospital, Community Centre, 48/1, D Block, East of Kailash, New Delhi, Delhi 110065",
    area: "East of Kailash",
    city: "New Delhi",
    lat: 28.5574541,
    lng: 77.2456791,
    rating: 4.3,
    phone: "+91 99106 73232",
    openingHours: "Open 24 hours",
    snookerTables: 2,
    poolTables: 1,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["AC", "24/7", "Friendly Owner"],
  },
  {
    name: "The Masters Snooker Club",
    address: "198, 14 Basement, Ramesh Market, Garhi Jharia Maria, East of Kailash, New Delhi, Delhi 110065",
    area: "East of Kailash",
    city: "New Delhi",
    lat: 28.5597494,
    lng: 77.2476663,
    rating: 5.0,
    phone: "+91 88608 81318",
    openingHours: "11:00 AM – 4:00 AM",
    snookerTables: 2,
    poolTables: 1,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["AC", "Late Night", "Friendly Staff"],
  },
  {
    name: "Alpha Cue – Snooker Club",
    address: "122-B, Nehru Enclave, Kalkaji, New Delhi, Delhi 110019",
    area: "Kalkaji, Nehru Enclave",
    city: "New Delhi",
    lat: 28.5425741,
    lng: 77.2508091,
    rating: 4.7,
    phone: "+91 99991 65116",
    openingHours: "11:00 AM – 11:00 PM",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["AC", "Food & Drinks", "IPL Screening", "Professional Tables", "Coaching"],
  },
  {
    name: "Snooker Arena",
    address: "Basement, 14/2, Kalkaji Extension, Kalkaji, New Delhi, Delhi 110019",
    area: "Kalkaji Extension",
    city: "New Delhi",
    lat: 28.5411317,
    lng: 77.2526224,
    rating: 4.9,
    phone: "+91 83680 97920",
    openingHours: "Open 24 hours",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["AC", "24/7", "PS5", "Good Food", "Affordable"],
  },
  {
    name: "The Snook House Cafe",
    address: "First Floor, Kailash Colony Market, HS-25, Kailash Colony, Greater Kailash, New Delhi, Delhi 110048",
    area: "Kailash Colony, Greater Kailash",
    city: "New Delhi",
    lat: 28.5537109,
    lng: 77.2408049,
    rating: 4.6,
    phone: "+91 11 4109 1991",
    openingHours: "12:00 PM – 1:00 AM",
    snookerTables: 2,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 220,
    amenities: ["Café", "Food Menu", "Drinks", "Late Night", "Good Vibe"],
  },
  {
    name: "The Snooker City",
    address: "247, 3rd Floor, Backside Sant Nagar, East of Kailash, New Delhi, Delhi 110065",
    area: "Sant Nagar, East of Kailash",
    city: "New Delhi",
    lat: 28.5556333,
    lng: 77.2490926,
    rating: 4.0,
    phone: "+91 98732 88800",
    openingHours: "12:00 PM – 5:00 AM",
    snookerTables: 2,
    poolTables: 1,
    snookerPricePerHour: 240,
    poolPricePerHour: 180,
    amenities: ["Late Night", "Wiraka Tables"],
  },
  {
    name: "The Gaming Dojo",
    address: "5/31 Basement, Vikram Vihar, Lajpat Nagar 4, New Delhi, Delhi 110024",
    area: "Lajpat Nagar 4, Amar Colony",
    city: "New Delhi",
    lat: 28.5633696,
    lng: 77.2393179,
    rating: 4.9,
    phone: "+91 93115 77757",
    openingHours: "11:00 AM – 2:00 AM",
    snookerTables: 2,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 200,
    amenities: ["PS5 Gaming", "Café", "120Hz TV", "Late Night", "Comfortable Seating"],
  },
  {
    name: "Oxzypool & Snooker Centre",
    address: "2nd Floor, SE-6A Extension, near Oxzy Gym, Singalpur Village, West Shalimar Bagh, Delhi 110088",
    area: "Shalimar Bagh",
    city: "New Delhi",
    lat: 28.7042851,
    lng: 77.1564211,
    rating: 4.1,
    phone: "+91 98113 68935",
    openingHours: "5:00 AM – 11:00 PM",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 200,
    poolPricePerHour: 120,
    amenities: ["Early Opening", "Budget Friendly"],
  },
  {
    name: "Aroplay",
    address: "1st Floor, Deep Market, Building No. 17, adjacent to Canara Bank, near Bansal Corner, Ashok Vihar, New Delhi, Delhi 110052",
    area: "Ashok Vihar",
    city: "New Delhi",
    lat: 28.6934071,
    lng: 77.1722569,
    rating: 5.0,
    phone: "+91 99539 53902",
    openingHours: "10:00 AM – 2:00 AM",
    snookerTables: 2,
    poolTables: 2,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["PS5 Gaming", "Food & Drinks", "Clean Air", "No Smoking", "Female Friendly", "Late Night"],
  },
  {
    name: "Rest & Cue Snooker",
    address: "A/4, Gujranwala Town Part 1, Model Town, Gujranwala Town, New Delhi, Delhi 110033",
    area: "Gujranwala Town",
    city: "New Delhi",
    lat: 28.6985872,
    lng: 77.1858443,
    rating: 5.0,
    phone: null,
    openingHours: "9:00 AM – 11:00 PM",
    snookerTables: 3,
    poolTables: 1,
    snookerPricePerHour: 200,
    poolPricePerHour: 150,
    amenities: ["Good Facilities", "Friendly Crowd"],
  },
  {
    name: "Stopshot Snooker & Cafe",
    address: "DU-13 Basement, near Chaska Restaurant, Block DU, Uttari Pitampura, Pitampura, New Delhi, Delhi 110034",
    area: "Pitampura",
    city: "New Delhi",
    lat: 28.7155702,
    lng: 77.1437813,
    rating: 4.9,
    phone: "+91 88604 03010",
    openingHours: "10:00 AM – 2:00 AM",
    snookerTables: 4,
    poolTables: 2,
    snookerPricePerHour: 300,
    poolPricePerHour: 300,
    amenities: ["AC", "Café", "Late Night", "Fresh Food & Drinks", "Premium Tables"],
  },
  {
    name: "Northern Snooker",
    address: "Basement, Kotak Mahindra Bank, HP-9, opposite Gopal Mandir Marg, Maurya Enclave, Pitampura, New Delhi, Delhi 110034",
    area: "Pitampura, Maurya Enclave",
    city: "New Delhi",
    lat: 28.702435,
    lng: 77.1477041,
    rating: 4.3,
    phone: "+91 79829 93566",
    openingHours: "11:00 AM – 9:00 PM",
    snookerTables: 6,
    poolTables: 2,
    snookerPricePerHour: 150,
    poolPricePerHour: 120,
    amenities: ["Smooth Tables", "Budget Friendly", "Multiple Tables"],
  },
  {
    name: "SNOOKER HUB",
    address: "Basement B-1244, nearby Haryana Sweets, Block B, Shastri Nagar, Delhi 110052",
    area: "Shastri Nagar",
    city: "New Delhi",
    lat: 28.6735461,
    lng: 77.1796339,
    rating: 5.0,
    phone: "+91 88026 28028",
    openingHours: "Open 24 hours",
    snookerTables: 3,
    poolTables: 2,
    snookerPricePerHour: 200,
    poolPricePerHour: 150,
    amenities: ["AC", "24/7", "PS5", "Coaching", "Snacks"],
  },
  {
    name: "Red Ball International",
    address: "A-199 Basement, below Bajaj Showroom, Gujranwala Town Part 1, New Delhi, Delhi 110033",
    area: "Gujranwala Town",
    city: "New Delhi",
    lat: 28.7005595,
    lng: 77.1840466,
    rating: 4.5,
    phone: "+91 89296 33777",
    openingHours: "9:00 AM – 11:00 PM",
    snookerTables: 4,
    poolTables: 3,
    snookerPricePerHour: 250,
    poolPricePerHour: 180,
    amenities: ["AC", "Café", "Hookah", "PS4/Xbox", "Premium Interior", "Lounge"],
  },
  {
    name: "Snooker Town",
    address: "Near B-926, Mother Dairy Rd, Block D, Shastri Nagar, Delhi 110052",
    area: "Shastri Nagar",
    city: "New Delhi",
    lat: 28.6731911,
    lng: 77.1824373,
    rating: 5.0,
    phone: null,
    openingHours: "10:00 AM – 11:00 PM",
    snookerTables: 3,
    poolTables: 1,
    snookerPricePerHour: 200,
    poolPricePerHour: 150,
    amenities: ["Cool Vibe", "Friendly Crowd"],
  },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🎱 Seeding ${clubs.length} new clubs (Faridabad + New Delhi areas)…\n`);

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

    // Upsert Location (find-or-create by city + area)
    const existingLoc = await prisma.location.findFirst({
      where: { city: raw.city, area: raw.area },
    });
    const locationId = existingLoc
      ? existingLoc.id
      : (await prisma.location.create({ data: { city: raw.city, area: raw.area } })).id;

    // Upsert Club
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
      console.log(`  ♻️  Updated  : ${raw.name} (${raw.city})`);
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
      console.log(`  ✅  Created  : ${raw.name} (${raw.city})`);
    }

    // Seed physical Tables
    await prisma.table.deleteMany({
      where: { clubId },
    });

    if (raw.snookerTables && raw.snookerTables > 0) {
      for (let j = 0; j < raw.snookerTables; j++) {
        await prisma.table.create({
          data: {
            name: `Snooker Table ${j + 1}`,
            type: 'SNOOKER',
            pricePerHour: raw.snookerPricePerHour,
            clubId,
            status: 'AVAILABLE',
          },
        });
      }
    }

    if (raw.poolTables && raw.poolTables > 0) {
      for (let j = 0; j < raw.poolTables; j++) {
        await prisma.table.create({
          data: {
            name: `Pool Table ${j + 1}`,
            type: 'EIGHT_BALL_POOL',
            pricePerHour: raw.poolPricePerHour,
            clubId,
            status: 'AVAILABLE',
          },
        });
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────
  const byCity = clubs.reduce<Record<string, number>>((acc, c) => {
    acc[c.city] = (acc[c.city] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n📊 Summary:");
  for (const [city, count] of Object.entries(byCity)) {
    console.log(`   ${city}: ${count} clubs`);
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