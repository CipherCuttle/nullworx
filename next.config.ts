import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The workspace lives under a directory with an unrelated parent lockfile.
  // Pin tracing to this repository so deployment output is not assembled from
  // the wrong root.
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
