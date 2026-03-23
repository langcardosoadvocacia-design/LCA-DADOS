/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['xzqhicgtlthltjhmdali.supabase.co'],
  },
  experimental: {
    serverActions: true,
  },
};

export default nextConfig;
