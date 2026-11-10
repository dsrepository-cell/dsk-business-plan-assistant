import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The DPR PDF route reads files from disk at run time that the bundler can't see, so ship them with that function:
  // our embedded Noto fonts, and pdfkit's built-in font metrics (loaded via its "#standard-fonts/*" import map).
  outputFileTracingIncludes: {
    '/api/plans/[planId]/pdf': [
      './src/assets/fonts/**',
      './node_modules/pdfkit/package.json',
      './node_modules/pdfkit/js/standard-fonts/**',
      './node_modules/pdfkit/js/data/**',
    ],
  },
};

export default nextConfig;
