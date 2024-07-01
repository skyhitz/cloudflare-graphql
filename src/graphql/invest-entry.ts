import Mailer from '../sendgrid/sendgrid';
import { Context } from '../util/types';
import { requireAuth } from '../auth/auth-context';

// TODO: Implement the investEntryResolver with Soroban
export const investEntryResolver = async (_: any, args: any, context: Context) => {
	const { id, amount } = args;
	const { env } = context;
	const user = requireAuth(context);

	return { xdr: '', success: false, submitted: false };
};
