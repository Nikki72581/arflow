// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/payment(.*)', // Allow payment success/cancel pages for Stripe redirects
]);

const isOnboardingRoute = createRouteMatcher(['/onboarding']);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  
  // Redirect authenticated users from root to dashboard
  if (userId && request.nextUrl.pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  // Allow public routes without authentication
  if (isPublicRoute(request)) {
    return;
  }
  
  // Protect onboarding route but allow authenticated users
  if (isOnboardingRoute(request)) {
    await auth.protect();
    return;
  }
  
  // Protect all other routes
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};