import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import prisma from '../../config/db';
import { sendResponse } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const logExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId, amount, category, description, date } = req.body;

  if (!clubId || !amount || !category) {
    return sendResponse(res, 400, false, 'Club ID, amount, and category are required');
  }

  // Verify club ownership
  const club = await prisma.club.findUnique({
    where: { id: clubId }
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  if (club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  const expense = await prisma.expense.create({
    data: {
      clubId,
      amount: parseFloat(amount),
      category,
      description,
      date: date ? new Date(date) : new Date()
    }
  });

  return sendResponse(res, 201, true, 'Expense logged successfully', expense);
});

export const getExpenses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId } = req.query;

  if (!clubId) {
    return sendResponse(res, 400, false, 'Club ID is required');
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId as string }
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  if (club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  const expenses = await prisma.expense.findMany({
    where: { clubId: clubId as string },
    orderBy: { date: 'desc' }
  });

  return sendResponse(res, 200, true, 'Expenses fetched successfully', expenses);
});

export const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const expense = await prisma.expense.findUnique({
    where: { id: id as string },
    include: { club: true }
  }) as any;

  if (!expense) {
    return sendResponse(res, 404, false, 'Expense not found');
  }

  if (expense.club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  await prisma.expense.delete({
    where: { id: id as string }
  });

  return sendResponse(res, 200, true, 'Expense deleted successfully');
});

export const getFinancialAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { clubId, year } = req.query;

  if (!clubId) {
    return sendResponse(res, 400, false, 'Club ID is required');
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId as string }
  });

  if (!club) {
    return sendResponse(res, 404, false, 'Club not found');
  }

  if (club.ownerId !== req.user?.id) {
    return sendResponse(res, 403, false, 'Unauthorized');
  }

  const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

  // 1. Fetch completed/confirmed bookings for revenue
  const bookings = await prisma.booking.findMany({
    where: {
      clubId: clubId as string,
      status: { in: ['CONFIRMED', 'COMPLETED'] }
    }
  });

  // 2. Fetch paid walk-in timers for revenue
  const timers = await prisma.tableTimer.findMany({
    where: {
      table: { clubId: clubId as string },
      status: 'PAID'
    }
  });

  // 3. Fetch expenses
  const expenses = await prisma.expense.findMany({
    where: { clubId: clubId as string }
  });

  // Revenue helper logic
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayRevenue = 0;
  let monthRevenue = 0;
  let yearRevenue = 0;

  // Bookings revenue calculation
  bookings.forEach((b: any) => {
    const amount = b.totalPrice;
    const date = new Date(b.startTime);

    if (date >= todayStart) todayRevenue += amount;
    if (date >= monthStart) monthRevenue += amount;
    if (date.getFullYear() === targetYear) yearRevenue += amount;
  });

  // Timers revenue calculation
  timers.forEach((t: any) => {
    const amount = t.finalAmount || 0;
    const date = new Date(t.startTime);

    if (date >= todayStart) todayRevenue += amount;
    if (date >= monthStart) monthRevenue += amount;
    if (date.getFullYear() === targetYear) yearRevenue += amount;
  });

  // Expense calculations
  let todayExpenses = 0;
  let monthExpenses = 0;
  let yearExpenses = 0;

  expenses.forEach((e: any) => {
    const amount = e.amount;
    const date = new Date(e.date);

    if (date >= todayStart) todayExpenses += amount;
    if (date >= monthStart) monthExpenses += amount;
    if (date.getFullYear() === targetYear) yearExpenses += amount;
  });

  // Expense categories breakdown (Month & Year)
  const categoryBreakdownMap = new Map<string, number>();
  let totalExpenses = 0;
  expenses.forEach((e: any) => {
    const date = new Date(e.date);
    if (date.getFullYear() === targetYear) {
      categoryBreakdownMap.set(e.category, (categoryBreakdownMap.get(e.category) || 0) + e.amount);
      totalExpenses += e.amount;
    }
  });

  const expenseBreakdown = Array.from(categoryBreakdownMap.entries()).map(([category, amount]) => ({
    category,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
  }));

  // Compile monthly ledger statement for targetYear
  const monthlyPL = Array.from({ length: 12 }, (_, index) => {
    const monthIndex = index; // 0 for Jan, 11 for Dec
    let rev = 0;
    let exp = 0;

    bookings.forEach((b: any) => {
      const date = new Date(b.startTime);
      if (date.getFullYear() === targetYear && date.getMonth() === monthIndex) {
        rev += b.totalPrice;
      }
    });

    timers.forEach((t: any) => {
      const date = new Date(t.startTime);
      if (date.getFullYear() === targetYear && date.getMonth() === monthIndex) {
        rev += t.finalAmount || 0;
      }
    });

    expenses.forEach((e: any) => {
      const date = new Date(e.date);
      if (date.getFullYear() === targetYear && date.getMonth() === monthIndex) {
        exp += e.amount;
      }
    });

    return {
      month: new Date(targetYear, monthIndex).toLocaleString('default', { month: 'short' }),
      revenue: Math.round((rev + Number.EPSILON) * 100) / 100,
      expenses: Math.round((exp + Number.EPSILON) * 100) / 100,
      net: Math.round((rev - exp + Number.EPSILON) * 100) / 100
    };
  });

  return sendResponse(res, 200, true, 'Financial analytics fetched successfully', {
    metrics: {
      today: {
        revenue: Math.round((todayRevenue + Number.EPSILON) * 100) / 100,
        expenses: Math.round((todayExpenses + Number.EPSILON) * 100) / 100,
        net: Math.round((todayRevenue - todayExpenses + Number.EPSILON) * 100) / 100
      },
      month: {
        revenue: Math.round((monthRevenue + Number.EPSILON) * 100) / 100,
        expenses: Math.round((monthExpenses + Number.EPSILON) * 100) / 100,
        net: Math.round((monthRevenue - monthExpenses + Number.EPSILON) * 100) / 100
      },
      year: {
        revenue: Math.round((yearRevenue + Number.EPSILON) * 100) / 100,
        expenses: Math.round((yearExpenses + Number.EPSILON) * 100) / 100,
        net: Math.round((yearRevenue - yearExpenses + Number.EPSILON) * 100) / 100
      }
    },
    expenseBreakdown,
    monthlyPL
  });
});
