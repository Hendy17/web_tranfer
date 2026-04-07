/** @type {import('next').NextConfig} */
const nextConfig = {
	allowedDevOrigins: ['127.0.0.1', 'localhost'],
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: 'http://localhost:3000/api/:path*',
			},
		];
	},
};

export default nextConfig;

