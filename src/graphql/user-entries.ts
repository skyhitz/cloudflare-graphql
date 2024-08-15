import StellarClient from '../stellar/operations';
import { AlgoliaClient } from '../algolia/algolia';
import { GraphQLError } from 'graphql';
import { Context } from '../util/types';

import {} from '../../contract';

export const userEntriesResolver = async (root: any, { userId }: any, { env }: Context) => {
	const algolia = new AlgoliaClient(env);
	const stellar = new StellarClient(env);
	try {
		const user = await algolia.getUser(userId);
		// user.publicKey is the Stellar public key

		return [];
		// return entries.filter((entry) => entry !== undefined);
	} catch (_) {
		throw new GraphQLError('Couldn not fetch user entries');
	}
};
