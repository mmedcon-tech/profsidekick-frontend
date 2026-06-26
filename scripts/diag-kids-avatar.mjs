import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = 'http://localhost:3000';
const BACKEND = 'http://localhost:8000';
const stamp = Date.now();
const user = {
  username: `diag_${stamp}`,
  email: `diag_${stamp}@example.com`,
  password: 'Passw0rd!23',
  firstName: 'Diag',
  lastName: 'User',
  role: 'student',
};

async function main() {
  // 1) Register directly against backend (SKIP_EMAIL_VERIFICATION auto-approves locally).
  const regRes = await fetch(`${BACKEND}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  console.log('register status', regRes.status);

  // 2) Login through the frontend BFF so the role is normalized to "subscriber".
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user.username, password: user.password }),
  });
  const loginData = await loginRes.json();
  console.log('login status', loginRes.status, 'role', loginData?.user?.role);
  if (!loginData?.token) {
    console.error('no token, aborting', loginData);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[AVATAR_DIAG]') || msg.type() === 'error' || msg.type() === 'warning') {
      logs.push(`[${msg.type()}] ${t}`);
    }
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

  // Seed auth before any app code runs.
  await page.addInitScript(
    ([token, u]) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(u));
      localStorage.setItem(
        'auth_expires_at',
        new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
      );
      window.__AVATAR_DIAG = true;
      window.__AVATAR_FORCE_TALK = true;
    },
    [loginData.token, loginData.user],
  );

  // Sum brightness over a horizontal band (yFrac..yFrac+hFrac) of a raw RGB frame.
  function bandSum(data, info, yFrac, hFrac) {
    const { width, height, channels } = info;
    const y0 = Math.floor(height * yFrac);
    const y1 = Math.min(height, Math.floor(height * (yFrac + hFrac)));
    let sum = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * channels;
        sum += data[i] + data[i + 1] + data[i + 2];
      }
    }
    return sum;
  }

  for (const id of ['avatar-1', 'avatar-2', 'kids-female', 'kids-male']) {
    logs.length = 0;
    await page.goto(`${BASE}/subscriber/marketplace/glb/${id}`, {
      waitUntil: 'networkidle',
    });
    try {
      await page.getByRole('button', { name: /3D model/i }).click({ timeout: 5000 });
    } catch (e) {
      logs.push(`[diag] could not click 3D model tab: ${e.message}`);
    }
    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 8000 });
    // Reset the recorded open-value range for this avatar.
    await page.evaluate(() => {
      delete window.__AVATAR_OPEN_MIN;
      delete window.__AVATAR_OPEN_MAX;
    });
    await page.waitForTimeout(3500);

    // Capture frames ~80ms apart to catch the synthetic mouth open/close cycle.
    const torso = [];
    for (let i = 0; i < 10; i += 1) {
      const shot = await canvas.screenshot();
      const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
      torso.push(bandSum(data, info, 0.6, 0.14));
      await page.waitForTimeout(80);
    }
    await page.screenshot({ path: `scripts/diag-${id}.png` });

    const openRange = await page.evaluate(() => ({
      min: window.__AVATAR_OPEN_MIN ?? -1,
      max: window.__AVATAR_OPEN_MAX ?? -1,
    }));

    const range = (vals) => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return max === 0 ? 0 : (max - min) / max;
    };

    console.log(`\n===== ${id} =====`);
    console.log(
      `mouth-open drive: min=${openRange.min.toFixed(3)} max=${openRange.max.toFixed(3)}  torso-motion=${(range(torso) * 100).toFixed(2)}%`,
    );
    if (logs.length) console.log(logs.join('\n'));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
