import { Keypair } from 'stellar-base';
import { AlgoliaClient } from '../algolia/algolia';
import { Context } from 'src/util/types';
import { GraphQLError } from 'graphql';
import Encryption from 'src/util/encryption';

export const migrateAccountsResolver = async (_: any, { accounts }: { accounts: string[] }, ctx: Context) => {
	const algolia = new AlgoliaClient(ctx.env);
	const encryption = new Encryption(ctx.env);
	try {
		// loop through accounts which are an array of secret keys
		for (const account of accounts) {
			// find the public key for each account
			const publicKey = Keypair.fromSecret(account).publicKey();
			// check if the account already exists in Algolia
			const res = await algolia.getUserByPublicKey(publicKey);
			// if the account does not exist, error and return
			if (!res) {
				throw new GraphQLError(`Account ${publicKey} does not exist`);
			}

			// update the account with the new secret key
			const newSeed = await encryption.encrypt(account);
			await algolia.partialUpdateUser({ objectID: res.objectID, seed: newSeed });
		}

		// Further processing can be done here, such as syncing with another data source
		return { success: true, message: 'Accounts migrated successfully' };
	} catch (error) {
		console.error('Failed to fetch entries from Algolia:', error);
		return { success: false, message: 'Failed to migrate accounts' };
	}
};
