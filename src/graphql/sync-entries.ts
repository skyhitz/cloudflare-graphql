// src/graphql/sync-entries.ts
import { syncEntries } from '../../contract';
import { AlgoliaClient } from '../algolia/algolia';
import { Context } from 'src/util/types';

export const syncEntriesResolver = async (_: any, __: any, ctx: Context) => {
	const algolia = new AlgoliaClient(ctx.env);
	try {
		const entries = await algolia.getAllEntries(); // Assuming AlgoliaClient has a method getAllEntries

		await syncEntries(entries.map((entry) => entry.id));
		// Further processing can be done here, such as syncing with another data source
		return { success: true, message: 'Entries fetched successfully', entries };
	} catch (error) {
		console.error('Failed to fetch entries from Algolia:', error);
		return { success: false, message: 'Failed to fetch entries' };
	}
};
