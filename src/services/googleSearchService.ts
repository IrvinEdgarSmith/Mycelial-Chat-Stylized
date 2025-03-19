interface GoogleSearchOptions {
  q: string;
  count?: number;
  start?: number;
}

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
  };
  error?: {
    message: string;
  }
}

export async function googleSearch(
  query: string,
  apiKey: string,
  searchId: string,
  options?: Partial<GoogleSearchOptions>
): Promise<GoogleSearchResult[]> {
  if (!apiKey || !searchId || !query.trim()) {
    throw new Error('Google API key, Search ID, and search query are required');
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    cx: searchId,
    q: query.trim(),
    num: String(options?.count || 5), // Default to 5 results
    start: String(options?.start || 1), // Default to start at the first result
  });

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${searchParams.toString()}`);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Google search error:', errorData);
    throw new Error(`Google search failed with status ${response.status}`);
  }

  const data: GoogleSearchResponse = await response.json();

  if (data.error) {
    console.error('Google search API error:', data.error.message);
    throw new Error('Google search API returned an error');
  }

  return data.items || [];
}

export function formatSearchResultsAsContext(results: GoogleSearchResult[], query: string): string {
  if (results.length === 0) {
    return `No search results found for "${query}"`;
  }

  let context = `Web search results for query: "${query}"\n\n`;

  results.forEach((result, index) => {
    context += `[${index + 1}] ${result.title}\n`;
    context += `URL: ${result.link}\n`;
    context += `${result.snippet}\n\n`;
  });

  return context;
}
