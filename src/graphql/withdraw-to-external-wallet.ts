import Encryption from '../util/encryption';
import StellarClient from '../stellar/operations';
import { GraphQLError } from 'graphql';
import { requireAuth } from 'src/auth/auth-context';

/**
 * Withdraws user balance to external address in XLM
 */
export const withdrawToExternalAddressResolver = async (_: any, { address, amount }: any, ctx: any) => {
	const user = requireAuth(ctx);
	const encryption = new Encryption(ctx.env);
	const stellar = new StellarClient(ctx.env);

	const { seed, publicKey } = user;

	if (!seed) {
		throw new GraphQLError('Withdraw is only available for custodial accounts');
	}

	try {
		const { availableCredits: currentBalance } = await stellar.accountCredits(publicKey);

		if (amount > currentBalance) {
			throw new GraphQLError('Your account balance is too low.');
		}

		console.log(`withdrawal to address ${address}, amount ${amount.toFixed(6)}`);
		const decryptedSeed = await encryption.decrypt(seed);
		await stellar.withdrawToExternalAddress(address, amount, decryptedSeed);
		return true;
	} catch (e) {
		console.log(`error`, e);
		if (typeof e === 'string') {
			throw new GraphQLError(e);
		}
		throw new GraphQLError('Unexpected error during withdrawal.');
	}
};
