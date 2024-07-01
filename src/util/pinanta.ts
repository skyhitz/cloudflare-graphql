import axios from 'axios';
import FormData from 'form-data';

type PinRes = {
	IpfsHash: string;
	PinSize: number;
	Timestamp: string;
	isDuplicate: boolean;
};
const ipfsUrl = 'https://ipfs.io/ipfs';

class Pinanta {
	private pinataApi: string = 'https://api.pinata.cloud';
	private pinataJwt: string;

	constructor(env: Env) {
		this.pinataJwt = env.PINATA_JWT || '';
	}

	public async pinIpfsFile(ipfsHash: string, name: string): Promise<unknown> {
		return await axios
			.post(
				`${this.pinataApi}/pinning/pinByHash`,
				{
					hashToPin: ipfsHash,
					pinataMetadata: {
						name: name,
					},
				},
				{
					headers: {
						Authorization: `Bearer ${this.pinataJwt}`,
						'Content-Type': 'application/json',
					},
				}
			)
			.then(({ data }) => data)
			.catch((error) => {
				console.log(error);
				return null;
			});
	}

	public async pinBuffer(buffer: Buffer, fileName: string): Promise<PinRes> {
		let data = new FormData();
		data.append('file', buffer, fileName);
		return this.pinData(data);
	}

	public async pinData(data: any) {
		const options = JSON.stringify({
			cidVersion: 1,
		});
		data.append('pinataOptions', options);

		const res = await axios.post(`${this.pinataApi}/pinning/pinFileToIPFS`, data, {
			headers: {
				'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
				Authorization: `Bearer ${this.pinataJwt}`,
			},
		});
		return res.data as PinRes;
	}

	public async pinAssetUrl(url: string): Promise<PinRes> {
		console.log(url);
		const data = new FormData();
		const response = await axios.get(url, {
			responseType: 'stream',
		});

		data.append(`file`, response.data);
		return this.pinData(data);
	}

	public async pinJSON(centralizedMeta: any) {
		const body = {
			pinataContent: centralizedMeta,
			pinataOptions: { cidVersion: 1 },
		};

		const { data }: { data: PinRes } = await axios.post(`${this.pinataApi}/pinning/pinJSONToIPFS`, body, {
			headers: { Authorization: `Bearer ${this.pinataJwt}` },
		});

		return data.IpfsHash;
	}

	public async pinExternalUrl(initial_url: string) {
		let url = '';
		if (initial_url.includes('ar://')) {
			url = initial_url.replace('ar://', 'https://arweave.net/');
		}

		const final_url = url ? url : initial_url;
		const res = await axios.head(final_url);

		if (res.status === 200) {
			// pin the url of the asset
			const { IpfsHash } = await this.pinAssetUrl(final_url);

			if (IpfsHash) {
				return IpfsHash;
			}
		}

		return null;
	}

	public async getIpfsHashForMedia(media: string) {
		var parts = media.split('/');

		if (parts[parts.length - 2].includes('ipfs') || parts[0].includes('ipfs:')) {
			return await this.findAndPinIpfsHash(parts);
		} else if (media) {
			const IpfsHash = await this.pinExternalUrl(media);

			if (IpfsHash) {
				return IpfsHash;
			}
		}
	}

	public async findAndPinIpfsHash(parts: string[]) {
		var ipfsHash = parts.pop() || parts.pop();

		const res = await axios.head(`${ipfsUrl}/${ipfsHash}`);

		if (res.status === 200) {
			// pin it to our server
			if (!ipfsHash) {
				return null;
			}
			await this.pinIpfsFile(ipfsHash, ipfsHash);
			return ipfsHash;
		}
	}
}

export default Pinanta;
