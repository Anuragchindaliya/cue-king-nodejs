import prisma from '../../config/db';

export const createClub = async (ownerId: string, data: any) => {
  const { tableCategories, ...restData } = data;

  const createData: any = {
    ...restData,
    ownerId,
  };

  if (tableCategories && Array.isArray(tableCategories)) {
    createData.tableCategories = {
      create: tableCategories
    };
  }

  return prisma.club.create({
    data: createData,
  });
};

export const updateClub = async (id: string, ownerId: string, data: any) => {
  return prisma.club.update({
    where: { id },
    data,
  });
};

import Fuse from 'fuse.js';

export const getSuggestions = async (query: string) => {
  // Fetch all clubs (ideally this would be cached in Redis in a real prod env)
  const allClubs = await prisma.club.findMany({
    select: {
      id: true,
      name: true,
      location: { select: { area: true, city: true } }
    },
  });

  const fuse = new Fuse(allClubs, {
    keys: ['name', 'location.area', 'location.city'],
    threshold: 0.4, // lower is more strict, 0.4 allows for typos
    distance: 100,
  });

  const results = fuse.search(query).slice(0, 5);
  return results.map(result => result.item);
};

export const getClubs = async (filters: any = {}) => {
  const {
    search,
    sortBy,
    tableTypes,
    minPrice,
    maxPrice,
    lat,
    lng,
    radius,
    amenities,
    openNow,
    is24_7,
    page = 1,
    limit = 10,
    ownerId,
    locationId,
  } = filters;

  const whereClause: any = {};

  if (ownerId) whereClause.ownerId = ownerId;
  if (locationId) whereClause.locationId = locationId;

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { fullAddress: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tableTypes && tableTypes.length > 0) {
    whereClause.tableCategories = {
      some: {
        name: { in: tableTypes },
      },
    };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    whereClause.tableCategories = {
      ...whereClause.tableCategories,
      some: {
        ...whereClause.tableCategories?.some,
        pricePerHour: {
          ...(minPrice !== undefined ? { gte: minPrice } : {}),
          ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
        },
      },
    };
  }

  if (amenities && amenities.length > 0) {
    whereClause.amenities = {
      hasEvery: amenities,
    };
  }

  if (is24_7) {
    whereClause.openingTime = '00:00';
    whereClause.closingTime = '23:59';
  }

  // Handle radius filtering using simple bounding box for efficiency before Haversine
  if (lat && lng && radius) {
    const r = radius / 111.32; // rough estimation: 1 deg = 111.32 km
    whereClause.lat = { gte: lat - r, lte: lat + r };
    whereClause.lng = { gte: lng - r, lte: lng + r };
  }

  const orderBy: any[] = [];
  if (sortBy === 'rating') {
    orderBy.push({ rating: 'desc' });
  } else if (sortBy === 'price_asc') {
    // skipped complex sorting for simplicity, rely on distance/rating
  } else if (sortBy === 'price_desc') {
    // skipped
  }
  orderBy.push({ createdAt: 'desc' });

  const shouldSortByDistance = sortBy === 'distance' && lat && lng;
  
  // If we have to filter by 'openNow', we might need to fetch all and filter in JS 
  // because Prisma doesn't support complex time string comparisons easily
  const skip = (page - 1) * limit;
  const needsLocalProcessing = shouldSortByDistance || openNow;

  let clubs = await prisma.club.findMany({
    where: whereClause,
    ...(needsLocalProcessing ? {} : { orderBy, skip, take: limit }),
    include: { location: true, tableCategories: true },
  });

  // Local processing for Open Now
  if (openNow) {
    const now = new Date();
    // Use IST timezone as requested/standard for India (GMT+5:30)
    const options = { timeZone: 'Asia/Kolkata', hour: '2-digit' as const, minute: '2-digit' as const, hour12: false };
    const currentTimeStr = new Intl.DateTimeFormat('en-GB', options).format(now);
    
    clubs = clubs.filter(club => {
      if (club.openingTime === '00:00' && club.closingTime === '23:59') return true;
      if (club.openingTime <= club.closingTime) {
        return currentTimeStr >= club.openingTime && currentTimeStr <= club.closingTime;
      } else {
        // Overnight, e.g. 18:00 to 04:00
        return currentTimeStr >= club.openingTime || currentTimeStr <= club.closingTime;
      }
    });
  }

  const total = needsLocalProcessing 
    ? clubs.length 
    : await prisma.club.count({ where: whereClause });

  // Calculate distance and sort
  if (lat && lng) {
    clubs = clubs.map(club => {
      let distance = Infinity;
      if (club.lat && club.lng) {
        const R = 6371; // km
        const dLat = (club.lat - lat) * Math.PI / 180;
        const dLon = (club.lng - lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(club.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = R * c;
      }
      return { ...club, distance };
    });

    if (shouldSortByDistance) {
      clubs.sort((a: any, b: any) => a.distance - b.distance);
    }
  }

  if (!shouldSortByDistance && (sortBy === 'price_asc' || sortBy === 'price_desc')) {
     clubs.sort((a, b) => {
        const minPriceA = Math.min(...a.tableCategories.map(tc => tc.pricePerHour));
        const minPriceB = Math.min(...b.tableCategories.map(tc => tc.pricePerHour));
        return sortBy === 'price_asc' ? minPriceA - minPriceB : minPriceB - minPriceA;
     });
  }

  if (needsLocalProcessing) {
    clubs = clubs.slice(skip, skip + limit);
  }

  return {
    data: clubs,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  };
};

export const getClubById = async (id: string) => {
  return prisma.club.findUnique({
    where: { id },
    include: { location: true, tableCategories: true },
  });
};

export const addTableCategory = async (clubId: string, data: any) => {
  return prisma.tableCategory.create({
    data: {
      ...data,
      clubId,
    },
  });
};
