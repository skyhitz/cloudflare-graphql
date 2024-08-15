import { GraphQLError } from 'graphql';
import { getEntry } from '../../contract';
import { User } from './types';

type FinancialEntry = {
	tvl: number;
	apr: number;
	escrow: number;
};

interface SorobanDataCache {
	[key: string]: FinancialEntry;
}

let sorobanDataCache: SorobanDataCache = {};

export const fetchSorobanData = async (id: string, bypass?: boolean, user?: User) => {
	try {
		if (bypass && !user) {
			throw new Error('User must be logged in to bypass cache');
		}
		const cachedData = sorobanDataCache[id];

		if (cachedData && !bypass) {
			console.log('Using cached data');
			return cachedData;
		}

		const newData = await getEntry(id);

		console.log('Updating cache for:', id);
		console.log(newData);

		const updatedData: FinancialEntry = {
			apr: newData.apr,
			tvl: newData.tvl,
			escrow: newData.escrow,
		};

		sorobanDataCache[id] = updatedData;
		return updatedData;
	} catch (error) {
		console.error('Error fetching Soroban data:', error);
		throw new GraphQLError('Failed to fetch data from Soroban');
	}
};

export const bustEntryCache = (id: string) => {
	delete sorobanDataCache[id];
	console.log(`Cache for entry ${id} has been busted`);
};
