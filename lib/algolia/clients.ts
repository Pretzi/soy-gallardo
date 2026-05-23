import { algoliasearch } from 'algoliasearch';
import {
  algoliaAdminConfigured,
  algoliaSearchConfigured,
  getAlgoliaApplicationId,
} from './config';

function appIdOrThrow(): string {
  const id = getAlgoliaApplicationId();
  if (!id) {
    throw new Error('ALGOLIA_APPLICATION_ID no está configurado');
  }
  return id;
}

export function getAlgoliaSearchClient() {
  if (!algoliaSearchConfigured()) {
    throw new Error('Algolia búsqueda no configurada (ALGOLIA_SEARCH_API_KEY)');
  }
  const key = process.env.ALGOLIA_SEARCH_API_KEY!.trim();
  return algoliasearch(appIdOrThrow(), key);
}

export function getAlgoliaAdminClient() {
  if (!algoliaAdminConfigured()) {
    throw new Error('Algolia admin no configurada (ALGOLIA_ADMIN_API_KEY)');
  }
  const key = process.env.ALGOLIA_ADMIN_API_KEY!.trim();
  return algoliasearch(appIdOrThrow(), key);
}
