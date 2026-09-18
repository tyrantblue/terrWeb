import { Link } from 'react-router-dom'

import {
  TerEmpty,
  TerPanel,
  TerSectionHeading,
} from '../ui'
import type { TerIconName } from '../ui/TerIcon'

/**
 * Placeholder for the sections still to be ported. Keeping them reachable
 * means the shell can be reviewed end to end before the page work starts.
 */
export default function V2Placeholder({
  title,
  icon,
  source,
}: {
  title: string
  icon: TerIconName
  /** The classic-UI route this section will replace. */
  source: string
}) {
  return (
    <div className="space-y-6">
      <TerSectionHeading
        title={title}
        icon={icon}
        description="Not ported yet — this stage only establishes the chrome."
      />

      <TerPanel mossTop className="p-6">
        <TerEmpty
          icon={icon}
          title={`${title} is still on the classic UI.`}
          hint={`Once the theme is signed off, this page is ported from ${source} and reuses the same API and providers.`}
        />
      </TerPanel>

      <div className="flex flex-wrap gap-2">
        <Link to={source} className="ter-button no-underline">
          Open the classic {title} page
        </Link>
        <Link to="/next/kit" className="ter-button ter-button-ghost no-underline">
          Review the component kit
        </Link>
      </div>
    </div>
  )
}
