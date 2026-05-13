import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './db';
import logger from '../utils/logger';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found from Google'), undefined);
          }

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            // If user exists but doesn't have googleId linked, we can link it
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { email },
                data: { googleId: profile.id },
              });
            }
            return done(null, user);
          }

          // Create new user if not exists
          user = await prisma.user.create({
            data: {
              email,
              googleId: profile.id,
              name: profile.displayName,
              role: 'PLAYER', // Default role for Google signups
            },
          });

          done(null, user);
        } catch (error) {
          logger.error('Error in Google Strategy:', error);
          done(error, undefined);
        }
      }
    )
  );
} else {
  logger.warn('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) not found. Google Auth strategy is skipped.');
}

export default passport;
