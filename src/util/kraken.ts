export function getKrakenHeaders(env: Env) {
	return {
		'Content-Type': 'application/json',
		'API-Key': env.KRAKEN_API_KEY,
		'API-Sign': env.KRAKEN_API_PRIVATE_KEY,
	};
}

export const krakenApiUrl = 'https://api.kraken.com';
