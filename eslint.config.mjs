import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
	{
		ignores: [
			".next/**",
			".open-next/**",
			".wrangler/**",
			"dist/**",
			"cloudflare-env.d.ts",
			"coverage/**",
		],
	},
	...nextCoreWebVitals,
	...nextTypescript,
];

export default eslintConfig;
