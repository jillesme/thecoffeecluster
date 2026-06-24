import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
	{
		ignores: [
			".next/**",
			".open-next/**",
			".wrangler/**",
			"**/.wrangler/**",
			"dist/**",
			"workers/*/dist/**",
			"workers/*/.flue-vite/**",
			"workers/*/.flue-vite.wrangler.jsonc",
			"workers/*/node_modules/**",
			"cloudflare-env.d.ts",
			"coverage/**",
		],
	},
	...nextCoreWebVitals,
	...nextTypescript,
];

export default eslintConfig;
