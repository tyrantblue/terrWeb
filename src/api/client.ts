export const API_BASE_URL = 'https://terraria-api.tyrantblue.xyz'

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    options,
  )

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status}`,
    )
  }

  return response.json()
}
