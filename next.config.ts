import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig = {
  // Your existing Next.js config options go here
  reactStrictMode: true,
};

export default withPWA(nextConfig);