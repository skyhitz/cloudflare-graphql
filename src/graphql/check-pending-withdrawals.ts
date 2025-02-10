import { AlgoliaClient } from 'src/algolia/algolia';
import { getKrakenHeaders, krakenApiUrl } from 'src/util/kraken';
import { Context, KrakenWithdrawStatus } from 'src/util/types';

export async function checkPendingWithdrawalsResolver(_: any, __: any, context: Context) {
	const algolia = new AlgoliaClient(context.env);

	const pendingWithdrawals = await algolia.getPendingWithdrawals();

	// Check Kraken status
	const statusRes = await fetch(`${krakenApiUrl}/0/private/WithdrawStatus`, {
		method: 'POST',
		headers: getKrakenHeaders(context.env),
		body: JSON.stringify({
			asset: 'XXLM',
			nonce: Date.now(),
		}),
	});

	const statusData: KrakenWithdrawStatus = await statusRes.json();

	if (statusData.error?.length > 0) {
		console.error('Kraken API error:', statusData.error);
		return false;
	}

	for (const withdrawal of pendingWithdrawals) {
		const withdrawalStatus = statusData.result.find((w) => w.refid === withdrawal.objectID);

		if (withdrawalStatus?.status === 'Success') {
			// Update withdrawal status
			await algolia.updateWithdrawalStatus(withdrawal.objectID, 'complete');
			// Remove minBalance flag
			const user = await algolia.getUserByEmail(withdrawal.email);
			if (!user) {
				console.error(`User not found for email: ${withdrawal.email}`);
				continue;
			}
			await algolia.updateUserMinBalance(user.id, 0);
			console.log(`Reset minBalance for user ${user.objectID}`);

			// delete withdraw object now that we have completed the transaction
			await algolia.deleteWithdrawal(withdrawal.objectID);
			console.log(`Deleted withdrawal ${withdrawal.objectID}`);
		}
	}

	return true;
}
