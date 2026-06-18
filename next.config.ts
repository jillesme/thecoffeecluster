import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: ['pg-cloudflare'],
	optimizePackageImports: ['lucide-react'],
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'img.thecoffeecluster.com',
			},
			{
				protocol: 'https',
				hostname: 'placehold.co',
			},
		],
	},
};

export default nextConfig;
