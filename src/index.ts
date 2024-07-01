import { ApolloServer } from '@apollo/server';
import { CloudflareWorkersHandler, startServerAndCreateCloudflareWorkersHandler } from '@as-integrations/cloudflare-workers';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { Context } from './util/types';

import { resolvers } from './graphql/resolvers';
import { Schema } from './graphql/schema';
import { authenticateUser } from './auth/auth-context';

const server = new ApolloServer<Context>({
	typeDefs: Schema,
	resolvers,
	introspection: true,
	plugins: [ApolloServerPluginLandingPageLocalDefault({ footer: false })],
});

let handler: CloudflareWorkersHandler<Env> = startServerAndCreateCloudflareWorkersHandler<Env, Context>(server, {
	context: authenticateUser,
});

export default {
	async fetch(request: Request, env: Env, context: ExecutionContext) {
		let response = await handler(request, env, context);

		response = new Response(response.body, response);

		// Set CORS headers
		response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Specify allowed methods
		response.headers.set('Access-Control-Allow-Headers', '*'); // Allow all headers
		response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight request for 24 hours

		return response;
	},
};
