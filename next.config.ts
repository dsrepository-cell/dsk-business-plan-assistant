import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The DPR PDF route reads the embedded Noto fonts from disk at run time; ship them with that function.
  outputFileTracingIncludes: {
    '/api/plans/[planId]/pdf': ['./src/assets/fonts/**'],
  },
};

export default nextConfig;
