import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    // Ensures Next/Turbopack resolve dependencies from this project.
    // Important when a parent folder contains its own package.json/lockfile.
    root: projectRoot,
  },
};

export default nextConfig;
