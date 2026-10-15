// Verification guard: prohibit provider traffic even if a fixture accidentally
// falls through to an upstream adapter. Tests assert the attempt log stays empty.
import fs from 'node:fs';
import net from 'node:net';
function deny() {
  if (process.env.COOKING_PI_NETWORK_LOG) fs.appendFileSync(process.env.COOKING_PI_NETWORK_LOG, 'blocked network attempt\n');
  throw new Error('Network is disabled by the cooking-pi verification fixture.');
}
globalThis.fetch = async () => deny();
net.Socket.prototype.connect = deny;
