import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

// We use "as any" here just in case your TypeScript version 
// throws a warning about the turbopack property
const nextConfig: any = {
  reactStrictMode: true,
  turbopack: {}, // ✅ This silences the Vercel Turbopack/Webpack worker error
};

export default withPWA(nextConfig);