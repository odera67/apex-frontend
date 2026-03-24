import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Update this list with any routes you want to hide behind a login
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/generate-program(.*)',
  '/check-in(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // 🚀 THE FIX: New Clerk v6 syntax for protecting routes!
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};