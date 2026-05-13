import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db';

const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN as any,
  });
};

export const registerUser = async (data: any) => {
  const { email, password, name, role } = data;

  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (userExists) {
    throw new Error('User already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role || 'PLAYER',
    },
  });

  const token = generateToken(user.id, user.role);

  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
};

export const loginUser = async (data: any) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user.id, user.role);

  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
};

export const generateTokenForUser = (user: any) => {
  return generateToken(user.id, user.role);
};
