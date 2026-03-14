/**
 * Keychain — secure API key storage via keytar (OS keychain).
 *
 * Storage location by platform:
 *   macOS  → Keychain Access
 *   Windows → Credential Vault
 *   Linux  → Secret Service (libsecret)
 *
 * The API key is NEVER written to electron-store or any log file.
 * CLI/headless fallback: OPENROUTER_API_KEY env var is checked first.
 */

import keytar from 'keytar'

const SERVICE = 'promptbetter'
const ACCOUNT = 'openrouter-api-key'

/**
 * Retrieve the stored API key.
 * Returns env var first (CLI/SSH/headless), then OS keychain, then null.
 */
export async function getApiKey(): Promise<string | null> {
  const envKey = process.env['OPENROUTER_API_KEY']
  if (envKey && envKey.trim().length > 0) return envKey.trim()
  return keytar.getPassword(SERVICE, ACCOUNT)
}

/**
 * Store the API key in the OS keychain.
 * Validates that the key starts with `sk-or-` before saving.
 *
 * @throws Error if the key format is invalid.
 */
export async function setApiKey(key: string): Promise<void> {
  if (!key.startsWith('sk-or-')) {
    throw new Error('Invalid API key format — must start with sk-or-')
  }
  await keytar.setPassword(SERVICE, ACCOUNT, key)
}

/**
 * Remove the API key from the OS keychain.
 * Returns true if a key was found and deleted, false if no key existed.
 */
export async function deleteApiKey(): Promise<boolean> {
  return keytar.deletePassword(SERVICE, ACCOUNT)
}
