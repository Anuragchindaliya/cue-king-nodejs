import prisma from '../config/db';
import logger from '../utils/logger';
import { publishNotification } from './sse.service';
import { createAppNotification, sendReminderEmail } from './notification.service';

export const startReminderScheduler = () => {
  logger.info('⏰ Booking reminder scheduler initialized');

  setInterval(async () => {
    try {
      const now = new Date();
      // Target range: bookings starting in 14 to 16 minutes (approx 15 mins)
      const minTime = new Date(now.getTime() + 14 * 60 * 1000);
      const maxTime = new Date(now.getTime() + 16 * 60 * 1000);

      const bookings = await prisma.booking.findMany({
        where: {
          startTime: {
            gte: minTime,
            lte: maxTime
          },
          status: 'CONFIRMED',
          reminderSent: false
        },
        include: {
          user: true,
          club: true,
          table: true
        }
      });

      if (bookings.length > 0) {
        logger.info(`Found ${bookings.length} booking(s) starting in 15 minutes. Processing reminders...`);

        for (const booking of bookings) {
          // 1. Update DB to mark reminder sent
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent: true }
          });

          // 2. Create in-app notification in DB & emit SSE 'new-notification'
          const title = 'Upcoming Booking!';
          const message = `Your booking for ${booking.table.name} at ${booking.club.name} starts at ${new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
          
          await createAppNotification(booking.userId, 'SYSTEM', title, message);

          // 3. Emit custom SSE event 'booking-reminder'
          await publishNotification(booking.userId, 'booking-reminder', {
            bookingId: booking.id,
            clubName: booking.club.name,
            tableName: booking.table.name,
            startTime: booking.startTime
          });

          // 4. Send email reminder with log/error fallback
          if (booking.user.email) {
            sendReminderEmail(
              booking.user.email,
              booking.club.name,
              booking.table.name,
              new Date(booking.startTime)
            ).catch(err => {
              logger.error(`Async email reminder failed for booking ${booking.id}:`, err);
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error running booking reminder scheduler job:', error);
    }
  }, 60 * 1000); // Check every 60 seconds
};
