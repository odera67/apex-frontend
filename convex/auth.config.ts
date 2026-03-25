// convex/auth.config.js

export default {
  providers: [
    {
      // This environment variable MUST be set in your Convex Dashboard
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ]
};