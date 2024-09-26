import { GraphQLError } from 'graphql';
import { Context } from 'src/util/types';
import ContractClient from '../../contract';
import { AlgoliaClient } from 'src/algolia/algolia';

export const distributePayouts = async (_: any, __: any, context: Context) => {
	const algolia = new AlgoliaClient(context.env);
	const date = new Date();

	const formattedDate = date.toISOString().split('T')[0];
	const timestamp = date.getTime();

	const distributed = await algolia.getDistributionTimestamp(formattedDate);

	if (distributed) {
		throw new GraphQLError('Payouts have already been distributed for today');
	}

	const contractClient = new ContractClient(context.env);

	const entries = await algolia.getAllEntries();

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (entry.escrow && entry.escrow > 0) {
			try {
				await contractClient.distributePayout(entry.id);
			} catch (e) {
				console.error('Failed to distribute payout for entry:', entry.id, e);
			}
		}
	}

	await algolia.setDistributionTimestamp(formattedDate, timestamp);

	return true;
};
