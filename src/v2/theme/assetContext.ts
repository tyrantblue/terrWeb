import { createContext, useContext } from 'react'

import type { AssetSource } from './assets'

/**
 * The icon half of the artwork source, published to the component tree so
 * `TerIcon` can pick it up wherever it is rendered. Without this the
 * "terraria.org (runtime)" / custom-base choices stored by the artwork
 * dialog changed the backdrop but silently left every icon on the
 * self-drawn sprite.
 */
export interface TerAssetValue {
  source: AssetSource
  /** Base URL for official-style icon PNGs; empty means self-drawn. */
  iconBase: string
}

export const TerAssetsContext = createContext<TerAssetValue>({
  source: 'original',
  iconBase: '',
})

export function useTerAssets() {
  return useContext(TerAssetsContext)
}
