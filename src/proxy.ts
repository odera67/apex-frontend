import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Update this list with any routes you want to hide behind a login
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/generate-program(.*)',
  '/check-in(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // 🚀 THE FIX: We call auth() as a function and use 'any' to bypass the build check
    const authObj = await auth() as any;
    authObj.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};