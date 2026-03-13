#!/usr/bin/env node
/**
 * PromptBetter CLI — thin wrapper over core/
 * Usage: pb <prompt>
 *
 * Implementation: P2 (future). Stub only.
 */

import { Command } from 'commander'
import { DEFAULT_MODEL, DEFAULT_PRESET } from '../shared/constants'

const program = new Command()

program
  .name('pb')
  .description('Improve AI coding prompts from the command line')
  .version('0.1.0')

program
  .argument('[prompt]', 'Prompt to improve (or reads from stdin)')
  .option('-m, --model <model>', 'Model to use', DEFAULT_MODEL)
  .option('--preset <preset>', 'Pattern preset', DEFAULT_PRESET)
  .action((_prompt: string | undefined, _options: Record<string, string>) => {
    console.log('CLI not yet implemented. Use the Electron app.')
    process.exit(1)
  })

program.parse()
