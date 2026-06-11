import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — there's an unrelated pnpm-lock.yaml further up the
  // tree, and without this Next infers the wrong root.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
