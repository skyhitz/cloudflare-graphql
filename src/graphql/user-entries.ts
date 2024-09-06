import { AlgoliaClient } from '../algolia/algolia';
import { GraphQLError } from 'graphql';
import { Context } from '../util/types';

export const userEntriesResolver = async (root: any, { userId }: any, { env }: Context) => {
	const algolia = new AlgoliaClient(env);
	try {
		const user = await algolia.getUser(userId);

		const entries = await algolia.getCollection(user.id);
		return await algolia.getMultiEntries(entries.map((entry) => entry.entryId));
	} catch (_) {
		throw new GraphQLError('Couldn not fetch user entries');
	}
};
