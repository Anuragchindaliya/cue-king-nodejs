import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './db';
import logger from '../utils/logger';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
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

export default passport;
