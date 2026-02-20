import type { PageServerLoad } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { getStyleMapData } from '$lib/db/queries';

export const load: PageServerLoad = async ({ platform }) => {
	const db = new D1Provider(platform!.env.DB);
	const { nodes, edges } = await getStyleMapData(db, 50);
	return { nodes, edges };
};
