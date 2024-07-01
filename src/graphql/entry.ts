import { GraphQLError } from 'graphql';
import { AlgoliaClient } from '../algolia/algolia';
import { Context } from '../util/types';

export const entryByIdResolver = async (_: any, { id }: any, { env }: Context) => {
	const algolia = new AlgoliaClient(env);
	let entry;
	try {
		entry = await algolia.getEntry(id);
	} catch (ex) {
		throw new GraphQLError('Entry with given id does not exist');
	}
	try {
		const [
			holders,
			//  history
		] = await Promise.all([
			fetchHolders(entry.id, env),
			// history was removed from stellar expert api
			// fetchHistory(assetId, api),
		]);
		return {
			...entry,
			holders,
			//  history
		};
	} catch (ex) {
		throw new GraphQLError("Couldn't fetch entry data");
	}
};

const fetchHolders = async (assetId: string, env: Env) => {
	// TODO: soroban get holders
	//   const url = `${env.STELLAR_NETWORK}/asset/${assetId}/holders?limit=100`;
	//   const res = await api.get(url).then(({ data }) => data._embedded.records);
	//   return res;
	return [];
};

// const fetchHistory = async (assetId: string, api: any) => {
//   const url = `${Config.STELLAR_NETWORK}/asset/${assetId}/history/all?limit=100`;
//   const res = await api.get(url).then(({ data }) => data._embedded.records);
//   return res;
// };
