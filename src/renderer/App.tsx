import React from 'react'
import { APP_NAME } from '../shared/constants'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const modKey = isMac ? '\u2318' : 'Ctrl'

export default function App(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-white mb-2">{APP_NAME}</h1>
        <p className="text-gray-400 text-sm">Press {modKey}+Shift+P to open</p>
      </div>
    </div>
  )
}
