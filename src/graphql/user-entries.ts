import StellarClient from '../stellar/operations';
import { AlgoliaClient } from '../algolia/algolia';
import { GraphQLError } from 'graphql';
import { Context } from '../util/types';

export const userEntriesResolver = async (root: any, { userId }: any, { env }: Context) => {
	const algolia = new AlgoliaClient(env);
	const stellar = new StellarClient(env);
	try {
		const user = await algolia.getUser(userId);
		// TODO: soroban get holders
		const assetCodes = await stellar.loadSkyhitzAssets(user.publicKey);
		const entries = await Promise.all(assetCodes.map((id) => algolia.getEntryByCode(id)));

		return entries.filter((entry) => entry !== undefined);
	} catch (_) {
		throw new GraphQLError('Couldn not fetch user entries');
	}
};
