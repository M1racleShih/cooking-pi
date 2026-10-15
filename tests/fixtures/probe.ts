import { appendFileSync, writeFileSync } from 'node:fs';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

export default function probe(pi: ExtensionAPI) {
  pi.on('agent_settled', () => {
    if (process.env.COOKING_PI_EVENTS) appendFileSync(process.env.COOKING_PI_EVENTS, '{"type":"agent_settled"}\n');
  });
  pi.registerCommand('cooking-check', {
    description: 'Offline acceptance probe, loaded only by tests',
    handler: (_args, ctx) => {
      const result = {
        editorInstalled: ctx.ui.getEditorComponent() !== undefined,
        model: ctx.model?.id, provider: ctx.model?.provider, thinking: pi.getThinkingLevel(),
        clearCommands: pi.getCommands().filter(c => c.name === 'clear'),
        writeOwner: pi.getAllTools().find(t => t.name === 'write')?.sourceInfo,
        commands: pi.getCommands().map(c => c.name),
        cwd: ctx.cwd,
      };
      writeFileSync(process.env.COOKING_PI_PROBE!, JSON.stringify(result, null, 2));
      ctx.ui.notify('COOKING_CHECK_OK', 'info');
    },
  });
  pi.registerCommand('cooking-custom', {
    description: 'Run a custom continuation without a user prompt',
    handler: () => pi.sendMessage({ customType: 'cooking-fixture', content: 'Synthetic custom continuation', display: false }, { triggerTurn: true }),
  });
}
