import { GraphQLError } from 'graphql';
import { Context } from 'src/util/types';
import ContractClient from '../../contract';
import { AlgoliaClient } from 'src/algolia/algolia';
import { requireAuth } from 'src/auth/auth-context';
import Encryption from 'src/util/encryption';

export const claimEarningsResolver = async (_: any, __: any, context: Context) => {
	const algolia = new AlgoliaClient(context.env);
	const user = await requireAuth(context);
	const encryption = new Encryption(context.env);

	const contractClient = new ContractClient(context.env);

	const entries = await algolia.getCollection(user.id);
	let totalClaimedAmount = 0;
	const claimedEntries = [];

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		try {
			const result = await contractClient.claimEarnings(user.publicKey, entry.entryId, await encryption.decrypt(user.seed));

			// Add the claimed amount to our running total
			if (result && result.claimedAmount) {
				totalClaimedAmount += result.claimedAmount;

				// Only add entries with non-zero claimed amounts
				if (result.claimedAmount > 0) {
					claimedEntries.push({
						entryId: entry.entryId,
						amount: result.claimedAmount,
					});
				}
			}
		} catch (e) {
			console.error('Failed to claim earnings for entry:', entry.entryId, e);
		}
	}

	return {
		success: true,
		totalClaimedAmount: totalClaimedAmount / 10 ** 7, // Convert from stroops to lumens
		claimedEntries,
	};
};
