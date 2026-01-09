// lib/auth.ts
import { currentUser } from '@clerk/nextjs/server';
import { db } from './db';
import { redirect } from 'next/navigation';

export async function getCurrentUserWithOrg() {
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    redirect('/sign-in');
  }

  const user = await db.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { organization: true },
  });

  // If user doesn't exist in our database, they need to complete onboarding
  if (!user) {
    redirect('/onboarding');
  }

  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUserWithOrg();
  
  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return user;
}

export async function getClerkUser() {
  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    redirect('/sign-in');
  }

  return clerkUser;
}