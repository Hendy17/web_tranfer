/** @type {import('next').NextConfig} */
const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

const nextConfig = {
	allowedDevOrigins: ['127.0.0.1', 'localhost'],
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: `${apiBaseUrl}/api/:path*`,
			},
		];
	},
};

export default nextConfig;

