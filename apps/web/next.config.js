import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const configuredApiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, '');
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const workspaceRoot = path.resolve(currentDir, '../..');

if (process.env.NODE_ENV === 'production' && !configuredApiBaseUrl) {
	throw new Error(
		'API_BASE_URL is required in production so apps/web can proxy /api/* requests to apps/api.',
	);
}

const apiBaseUrl = configuredApiBaseUrl || 'http://localhost:3000';

const nextConfig = {
	allowedDevOrigins: ['127.0.0.1', 'localhost'],
	outputFileTracingRoot: workspaceRoot,
	turbopack: {
		root: workspaceRoot,
	},
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

