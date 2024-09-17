import { Horizon, Keypair, Transaction, hash, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Client, Entry, networks } from './client';

Horizon.AxiosClient.defaults.adapter = 'fetch';

// serialize big int
(BigInt.prototype as any).toJSON = function () {
	const int = Number.parseInt(this.toString());
	return int ?? this.toString();
};

type HorizonUrl = 'https://horizon-testnet.stellar.org' | 'https://horizon.stellar.org';
type Network = 'testnet' | 'mainnet';
type RpcUrl = 'https://soroban-testnet.stellar.org' | 'https://soroban-rpc.mainnet.stellar.gateway.fm';

class ContractClient {
	private sourceKeys: Keypair;
	private contract: Client;
	private defaultOptions = { timeoutInSeconds: 60, fee: 100000000 };
	private network: Network;
	private horizonUrl: HorizonUrl;
	private rpcUrl: RpcUrl;

	constructor(env: Env) {
		this.sourceKeys = Keypair.fromSecret(env.ISSUER_SEED);
		this.network = env.STELLAR_NETWORK as Network;
		this.horizonUrl = env.STELLAR_NETWORK === 'testnet' ? 'https://horizon-testnet.stellar.org' : 'https://horizon.stellar.org';
		this.rpcUrl =
			env.STELLAR_NETWORK === 'testnet' ? 'https://soroban-testnet.stellar.org' : 'https://soroban-rpc.mainnet.stellar.gateway.fm';
		this.contract = this.getClientForKeypair(this.sourceKeys);
	}

	public getClientForKeypair(keys: Keypair) {
		const [network] = Object.values(networks);

		return new Client({
			contractId: network.contractId,
			networkPassphrase: network.networkPassphrase,
			rpcUrl: this.rpcUrl,
			publicKey: keys.publicKey(),
			signTransaction: async (tx: string, opts) => {
				const txFromXDR = new Transaction(tx, network.networkPassphrase);
				txFromXDR.sign(keys);
				return txFromXDR.toXDR();
			},
			signAuthEntry: async (entryXdr, opts) => {
				return keys.sign(hash(Buffer.from(entryXdr, 'base64'))).toString('base64');
			},
		});
	}

	public async fetchCurrentLedger() {
		try {
			const response = await fetch(this.horizonUrl);
			const data: any = await response.json();
			return data.core_latest_ledger;
		} catch (error) {
			console.error('Error fetching current ledger:', error);
			return null;
		}
	}

	public distributePayouts = async () => {
		let tx = await this.contract.distribute_payouts();

		const res = await tx.signAndSend();
		return res;
	};

	public setEntry = async (entry: Entry) => {
		const tx = await this.contract.set_entry({ entry }, this.defaultOptions);
		const res = await tx.signAndSend();
		console.log(res.getTransactionResponse);
		console.log(res.result);
		return res;
	};

	public getEntry = async (id: string) => {
		const tx = await this.contract.get_entry({ id }, this.defaultOptions);
		console.log(tx);
		console.log(tx.simulationData);
		return { ...tx.result, apr: Number(tx.result.apr), escrow: Number(tx.result.escrow), tvl: Number(tx.result.tvl) };
	};

	public init = async (ids: string[]) => {
		console.log('init', ids);
		const tx = await this.contract.init({ admin: this.sourceKeys.publicKey(), network: this.network, ids: ids }, this.defaultOptions);
		console.log(tx);
		const res = await tx.signAndSend();
		console.log(res);
		return res;
	};

	public invest = async (secret: string, id: string, amount: number) => {
		const userKeys = Keypair.fromSecret(secret);
		const tx = await this.contract.invest(
			{
				user: userKeys.publicKey(),
				id,
				amount: BigInt(amount),
			},
			this.defaultOptions
		);

		const jsonFromRoot = tx.toJSON();
		const userClient = this.getClientForKeypair(userKeys);
		const txUser = userClient.fromJSON['invest'](jsonFromRoot);
		const ledger = (await this.fetchCurrentLedger()) + 100;
		await txUser.signAuthEntries({ expiration: ledger });
		const jsonFromUser = txUser.toJSON();
		const txRoot = this.contract.fromJSON['invest'](jsonFromUser);
		const result = await txRoot.signAndSend();
		const getRes = result.getTransactionResponse as any;
		console.log(getRes.resultXdr.toXDR('base64'));
		xdr.TransactionMeta.fromXDR(getRes.resultMetaXdr.toXDR('base64'), 'base64')
			.v3()
			.sorobanMeta()
			?.diagnosticEvents()
			.forEach((event: any) => {
				console.log(scValToNative(event.event().body().v0().data()));
			});
		return result.getTransactionResponse;
	};
}

export default ContractClient;
