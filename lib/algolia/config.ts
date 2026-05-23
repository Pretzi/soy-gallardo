export function getAlgoliaIndexName(): string {
  return (process.env.ALGOLIA_ENTRIES_INDEX || 'entries').trim();
}

export function getAlgoliaApplicationId(): string | undefined {
  const v = process.env.ALGOLIA_APPLICATION_ID?.trim();
  return v || undefined;
}

export function algoliaSearchConfigured(): boolean {
  return !!(getAlgoliaApplicationId() && process.env.ALGOLIA_SEARCH_API_KEY?.trim());
}

export function algoliaAdminConfigured(): boolean {
  return !!(getAlgoliaApplicationId() && process.env.ALGOLIA_ADMIN_API_KEY?.trim());
}
