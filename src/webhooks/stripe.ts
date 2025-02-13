import { AlgoliaClient } from 'src/algolia/algolia';
import StellarClient from 'src/stellar/operations';
import StripeClient from 'src/stripe/client';
import { createUserWithEmailResolver } from 'src/graphql/create-user-with-email';
import { Context } from 'src/util/types';
import KrakenClient from 'src/kraken/client';

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
	const sig = request.headers.get('stripe-signature');
	if (!sig) {
		return new Response('No signature', { status: 400 });
	}

	const body = await request.text();

	const { stripe, webhookSecret } = new StripeClient(env);
	console.log('webhook secret', webhookSecret);

	let event;

	try {
		event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
	} catch (err: any) {
		return new Response(`Webhook Error: ${err.message}`, { status: 400 });
	}

	// Handle the event
	switch (event.type) {
		case 'payment_intent.succeeded':
			const paymentIntentSucceeded = event.data.object;
			console.log(paymentIntentSucceeded);

			if (paymentIntentSucceeded.status === 'succeeded') {
				const amount = paymentIntentSucceeded.amount;
				const userEmail = paymentIntentSucceeded.receipt_email;
				if (!userEmail) return new Response(null, { status: 200 });

				await buyXLMWithUSD(amount, userEmail, env);
			}

			// Then define and call a function to handle the event payment_intent.succeeded
			break;
		// ... handle other event types
		default:
			console.log(`Unhandled event type ${event.type}`);
	}

	// Return a 200 response to acknowledge receipt of the event
	return new Response(null, { status: 200 });
}

async function buyXLMWithUSD(amount: number, email: string, env: Env) {
	const krakenClient = new KrakenClient(env);
	try {
		const usdAmount = amount / 100; // Convert cents back to dollars for Kraken

		const { result, xlmAmount } = await krakenClient.buyAndWithdrawXLM(usdAmount);

		if (result?.refid) {
			const algolia = new AlgoliaClient(env);

			await algolia.saveWithdrawal({
				objectID: result.refid,
				amount: xlmAmount,
				status: 'pending',
				email: email,
				timestamp: Date.now(),
			});
		}

		await sendFundsToUser(email, xlmAmount, env);

		return new Response('Payment processed successfully, XLM transaction initiated', { status: 200 });
	} catch (error: any) {
		console.error('Error in processing payment:', error);
		return new Response('Error processing payment: ' + error.message, { status: 500 });
	}
}

async function sendFundsToUser(email: string, amount: number, env: Env) {
	const algolia = new AlgoliaClient(env);
	const stellar = new StellarClient(env);
	const user = await algolia.getUserByEmail(email);
	// check if user has account
	if (!user) {
		// create account and set username and displayName using the part before '@'
		const username = email.split('@')[0];
		// check if user has account
		const ctx: Context = { env };
		await createUserWithEmailResolver(null, { email: email, username: username, displayName: username }, ctx);
		const newUser = await algolia.getUserByEmail(email);

		if (newUser && newUser.publicKey) {
			await stellar.pay(newUser.publicKey, amount);
			await algolia.updateUserMinBalance(newUser.objectID, amount);
		}
	} else {
		if (user && user.publicKey) {
			await stellar.pay(user.publicKey, amount);
			await algolia.updateUserMinBalance(user.objectID, amount);
		}
	}
}
