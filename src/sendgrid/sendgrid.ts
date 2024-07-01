import sgMail from '@sendgrid/mail';
import { User } from '../util/types';

class Mailer {
	constructor(private env: Env) {
		if (this.env.SENDGRID_API_KEY) sgMail.setApiKey(this.env.SENDGRID_API_KEY);
	}

	sendNftSoldEmail(email: string) {
		return this.sendMail(email, '¡You just sold a music NFT!', 'd-6687be08e2934811b986c23132b548c1');
	}

	sendNftBoughtEmail(email: string) {
		return this.sendMail(email, '¡Now you own a music NFT!', 'd-0d6857da22a54950b1350666181393da');
	}

	sendWelcomeEmail(email: string) {
		return this.sendMail(email, 'Welcome to Skyhitz', 'd-08b9dce0c7d94526aeee9ec06dc1994d');
	}

	async sendLoginEmail(currentUser: User, token: string) {
		return await sgMail.send({
			to: currentUser.email,
			from: { email: 'hello@skyhitz.io', name: 'Skyhitz' },
			subject: 'Log In To Your Skyhitz Account',
			templateId: 'd-906d105dea7e43d79d8df30c739137a1',
			personalizations: [
				{
					to: [{ email: currentUser.email }],
					dynamicTemplateData: {
						login_link: `${this.env.APP_URL}/sign-in?token=${token}&uid=${encodeURIComponent(currentUser.id)}`,
					},
				},
			],
		});
	}

	private sendMail(email: string, subject: string, templateId: string) {
		return sgMail.send({
			to: email,
			from: { email: 'hello@skyhitz.io', name: 'Skyhitz' },
			subject: subject,
			templateId: templateId,
		});
	}
}

export default Mailer;
