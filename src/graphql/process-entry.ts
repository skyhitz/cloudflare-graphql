import { decentralizeEntryResolver } from './decentralize-entry';
import { indexEntryResolver } from './index-entry';
import { Context } from 'src/util/types';

export const processEntryResolver = async (_: any, { contract, tokenId, network }: any, ctx: Context) => {
	const { media: fileCid, metadata: metaCid } = await decentralizeEntryResolver(
		_,
		{
			contract,
			tokenId,
			network,
		},
		ctx
	);

	const res = await indexEntryResolver(_, { contract, tokenId, network, metaCid, fileCid }, ctx);

	return res;
};
