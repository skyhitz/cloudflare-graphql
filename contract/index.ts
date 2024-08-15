import { Horizon, Keypair, Transaction, hash, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Client, Entry, networks } from '../contract/client/src/index';

// set adapter to fetch
Horizon.AxiosClient.defaults.adapter = 'fetch';

// serialize big int
(BigInt.prototype as any).toJSON = function () {
	const int = Number.parseInt(this.toString());
	return int ?? this.toString();
};

// import { getAuthenticatedUser } from '../auth/logic';
// import { decrypt } from 'src/util/encryption';

// const userKeys = Keypair.fromSecret(decrypt(user.seed));

// GBZP6P7QNKI342HNDUWXG5TE6DPIRIJBMERMZY5VCVHKVI67TJAYSK2C
// const userKeys = Keypair.fromSecret('SC5FF7SJOUA3XVCSPIXEG6L2ORFHQ6BTVJBJH345W2GRSACKYIUXUDUP');

// GD7BAZM73BXQTMRHA2JVJPE5X4AATOMOIXGA76N22JNTNMVXRQW5DR4B
const sourceKeys = Keypair.fromSecret('SB6NGNDLFKMRK4XW2W5OWFMJ2LIJ5SBXJU2X5TRSPXR2UNDOXHHZNKWY');

const fetchCurrentLedger = async () => {
	const url = 'https://horizon-testnet.stellar.org';
	try {
		const response = await fetch(url);
		const data: any = await response.json();
		return data.core_latest_ledger;
	} catch (error) {
		console.error('Error fetching current ledger:', error);
		return null;
	}
};

const defaultOptions = { timeoutInSeconds: 60, fee: 100000000 };

function getClientForKeypair(keys: Keypair) {
	return new Client({
		contractId: networks.testnet.contractId,
		networkPassphrase: networks.testnet.networkPassphrase,
		rpcUrl: 'https://soroban-testnet.stellar.org',
		publicKey: keys.publicKey(),
		signTransaction: async (tx: string, opts) => {
			const txFromXDR = new Transaction(tx, networks.testnet.networkPassphrase);

			txFromXDR.sign(keys);

			return txFromXDR.toXDR();
		},
		signAuthEntry: async (entryXdr, opts) => {
			return keys.sign(hash(Buffer.from(entryXdr, 'base64'))).toString('base64');
		},
	});
}

const new_entry: Entry = {
	id: 'yeah',
	tvl: BigInt(0),
	apr: BigInt(0),
	shares: new Map(),
	escrow: BigInt(0),
};

export const setEntry = async () => {
	const contract = getClientForKeypair(sourceKeys);
	const tx = await contract.set_entry({ entry: new_entry }, defaultOptions);

	const res = await tx.signAndSend();

	console.log(res.getTransactionResponse);
	console.log(res.result);
	return res;
};

export const getEntry = async (id: string) => {
	const contract = getClientForKeypair(sourceKeys);
	const tx = await contract.get_entry(
		{
			id,
		},
		defaultOptions
	);
	console.log(tx);
	console.log(tx.simulationData);

	return { ...tx.result, apr: Number(tx.result.apr), escrow: Number(tx.result.escrow), tvl: Number(tx.result.tvl) };
};

// add sync entries
export const syncEntries = async (ids: string[]) => {
	const contract = getClientForKeypair(sourceKeys);
	const tx = await contract.sync_entries({ ids: ids }, defaultOptions);

	console.log(tx);
	const res = await tx.signAndSend();

	console.log(res);
	return res;
};

const distributePayouts = async () => {
	const contract = getClientForKeypair(sourceKeys);

	// get mft issuer with our logic
	let tx = await contract.distribute_payouts();
	return tx.result;
};

export const invest = async (secret: string, id: string, amount: number) => {
	const contract = getClientForKeypair(sourceKeys);
	const userKeys = Keypair.fromSecret(secret);

	// get mft issuer with our logic
	let tx = await contract.invest(
		{
			user: userKeys.publicKey(),
			id,
			amount: BigInt(amount),
		},
		defaultOptions
	);

	const jsonFromRoot = tx.toJSON();

	const userClient = getClientForKeypair(userKeys);

	const txUser = userClient.fromJSON['invest'](jsonFromRoot);

	const ledger = (await fetchCurrentLedger()) + 100;

	await txUser.signAuthEntries({ expiration: ledger });

	const jsonFromUser = txUser.toJSON();

	const txRoot = contract.fromJSON['invest'](jsonFromUser);

	const result = await txRoot.signAndSend();

	const getRes = result.getTransactionResponse as any;

	console.log(getRes.resultXdr.toXDR('base64'));

	xdr.TransactionMeta.fromXDR(getRes.resultMetaXdr.toXDR('base64'), 'base64')
		.v3()
		.sorobanMeta()
		?.diagnosticEvents()
		.forEach((event: any) => {
			// console.log(event);
			// console.log('event', event.event().body().v0().data().toXDR('base64'));
			console.log(scValToNative(event.event().body().v0().data()));
		});

	return result.getTransactionResponse;
};

export const callContract = async (_: any, args: any, ctx: any) => {
	// const user = await getAuthenticatedUser(ctx);

	const { fn, ipfs_hash } = args;

	switch (fn) {
		case 'setEntry':
			return setEntry();
		case 'getEntry':
			return getEntry(ipfs_hash);
		// case 'invest':
		// 	return invest(ipfs_hash, 10000000);
		case 'distribute':
			return distributePayouts();
	}

	return {};
};
