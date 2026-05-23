import { Telegraf, Markup } from 'telegraf';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import logger from '../utils/logger';
import { emitToUser } from '../config/socket';
import { publishNotification } from './sse.service';

const telegramBot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export const initTelegramBot = () => {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    telegramBot.launch().catch(err => logger.error('Failed to launch Telegram bot', err));
    logger.info('Telegram bot initialized');
  } else {
    logger.warn('TELEGRAM_BOT_TOKEN is not set, skipping Telegram bot initialization');
  }
};

export const notifyVendor = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      club: {
        include: { owner: true }
      },
      table: true,
      user: true,
    }
  });

  if (!booking) return;

  const vendor = booking.club.owner;
  const message = `New Booking Request!\n\nClub: ${booking.club.name}\nTable: ${booking.table.name}\nTime: ${booking.startTime.toLocaleString()} - ${booking.endTime.toLocaleString()}\nUser: ${booking.user.name || booking.user.email}\n\nPlease accept or reject this request.`;

  // 1. Send Telegram Notification
  if (vendor.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await telegramBot.telegram.sendMessage(
        vendor.telegramChatId,
        message,
        Markup.inlineKeyboard([
          Markup.button.callback('Accept', `accept_${booking.id}`),
          Markup.button.callback('Reject', `reject_${booking.id}`),
        ])
      );
    } catch (error) {
      logger.error(`Failed to send Telegram message to vendor ${vendor.id}:`, error);
    }
  }

  // 2. Send Email Magic Link
  if (vendor.email && process.env.SMTP_USER) {
    const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_for_cue_king';
    const acceptToken = jwt.sign({ bookingId: booking.id, action: 'accept' }, secret, { expiresIn: '1h' });
    const rejectToken = jwt.sign({ bookingId: booking.id, action: 'reject' }, secret, { expiresIn: '1h' });

    const baseUrl = process.env.APP_URL || 'http://localhost:5001';
    const acceptUrl = `${baseUrl}/api/v1/booking/verify-booking?token=${acceptToken}`;
    const rejectUrl = `${baseUrl}/api/v1/booking/verify-booking?token=${rejectToken}`;

    const html = `
      <h3>New Booking Request</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <p>
        <a href="${acceptUrl}" style="padding: 10px 20px; background-color: green; color: white; text-decoration: none; margin-right: 10px;">Accept</a>
        <a href="${rejectUrl}" style="padding: 10px 20px; background-color: red; color: white; text-decoration: none;">Reject</a>
      </p>
    `;

    try {
      await transporter.sendMail({
        from: `"Cue King" <${process.env.SMTP_USER}>`,
        to: vendor.email,
        subject: `New Booking Request at ${booking.club.name}`,
        html,
      });
    } catch (error) {
      logger.error(`Failed to send email to vendor ${vendor.email}:`, error);
    }
  }
};

export const notifyPlayer = async (bookingId: string, status: 'CONFIRMED' | 'CANCELLED') => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      club: true,
    }
  });

  if (!booking || !booking.user.email) return;

  const subject = status === 'CONFIRMED' ? 'Booking Confirmed!' : 'Booking Rejected';
  const text = `Your booking at ${booking.club.name} for ${booking.startTime.toLocaleString()} has been ${status.toLowerCase()}.`;

  if (process.env.SMTP_USER) {
    try {
      await transporter.sendMail({
        from: `"Cue King" <${process.env.SMTP_USER}>`,
        to: booking.user.email,
        subject,
        text,
      });
    } catch (error) {
      logger.error(`Failed to send email to player ${booking.user.email}:`, error);
    }
  }
};

// Handle Telegram callback queries
telegramBot.on('callback_query', async (ctx) => {
  // @ts-ignore
  const data = ctx.callbackQuery.data;
  if (data && (data.startsWith('accept_') || data.startsWith('reject_'))) {
    const action = data.split('_')[0];
    const bookingId = data.split('_')[1];

    try {
      const status = action === 'accept' ? 'CONFIRMED' : 'CANCELLED';
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status },
      });

      await notifyPlayer(bookingId, status);
      await ctx.editMessageText(`Booking ${status.toLowerCase()} successfully.`);
    } catch (error) {
      logger.error('Error processing Telegram callback query:', error);
      await ctx.answerCbQuery('Failed to process request.');
    }
  }
});

export const createAppNotification = async (
  userId: string,
  type: 'BOOKING_CREATED' | 'BOOKING_APPROVED' | 'BOOKING_REJECTED' | 'BOOKING_CANCELLED' | 'SYSTEM',
  title: string,
  message: string
) => {
  const notif = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      isRead: false,
    },
  });

  emitToUser(userId, 'new-notification', notif);
  // Publish via Server-Sent Events (SSE)
  publishNotification(userId, 'new-notification', notif).catch(err => {
    logger.error('Failed to publish SSE notification:', err);
  });
  return notif;
};
