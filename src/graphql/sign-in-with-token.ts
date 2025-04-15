import { GraphQLError } from 'graphql';
import { sign } from '@tsndr/cloudflare-worker-jwt';
import PasswordlessAuth from '../auth/passwordless';
import { Context } from '../util/types';
import { AlgoliaClient } from '../algolia/algolia';
import { claimEarningsResolver } from './claim-earnings';

export const signInWithTokenResolver = async (_: any, { token: graphQLToken, uid }: any, context: Context) => {
	const { env } = context;
	const passwordlessAuth = new PasswordlessAuth(env);

	const { valid } = await passwordlessAuth.authenticate(graphQLToken, uid);

	if (!valid) {
		throw new GraphQLError('Provided link is not valid');
	}

	const client = new AlgoliaClient(env);
	let user = await client.getUser(uid);
	const token = await sign(
		{
			email: user.email,
			version: user.version,
			sub: user.id,
		} as any,
		env.JWT_SECRET,
		{ algorithm: 'HS256' }
	);
	user.jwt = token;

	await passwordlessAuth.invalidateUser(uid);

	// Automatically claim earnings after successful login
	try {
		// Create a temporary context with the authenticated user
		const userContext: Context = {
			user,
			env: context.env,
		};

		const claimResult = await claimEarningsResolver(null, null, userContext);

		// Add claim results to the user object
		user.claimEarnings = {
			success: claimResult.success,
			totalClaimedAmount: claimResult.totalClaimedAmount,
			claimedEntries: claimResult.claimedEntries,
		};
	} catch (error) {
		console.error('Failed to claim earnings during login:', error);
		// Continue with login even if claiming earnings fails
		user.claimEarnings = {
			success: false,
			totalClaimedAmount: 0,
			claimedEntries: [],
		};
	}

	return { ...user, managed: user.seed !== '' };
};
