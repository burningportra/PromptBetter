import React from 'react'
import { Panel } from './components/Panel'
import { useHydrateStores } from './hooks/useHydrateStores'

export default function App(): React.ReactElement {
  useHydrateStores()

  return <Panel />
}
