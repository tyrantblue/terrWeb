import { createContext, useContext } from 'react'

import type { AssetSettings } from './assets'

/**
 * Artwork source published to the component tree.
 *
 * Every piece of v2 chrome is referenced at runtime rather than drawn
 * in-repo, so both halves — the chrome base URL and the icon template —
 * have to reach the components that render them. Without this the artwork
 * dialog changed the backdrop but silently left every icon on its default
 * set.
 */
export interface TerAssetValue {
  assets: AssetSettings
  update: (next: AssetSettings) => void
}

export const TerAssetsContext = createContext<TerAssetValue | null>(null)

export function useTerAssets() {
  const value = useContext(TerAssetsContext)

  if (value === null) {
    throw new Error('useTerAssets must be used inside the v2 layout')
  }

  return value
}
