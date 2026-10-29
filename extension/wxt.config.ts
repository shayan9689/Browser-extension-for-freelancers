import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { SITE_MATCHES } from './src/shared/sites';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'ProposalPilot',
    // version comes from package.json (single source of truth; see `npm run bump`)
    description:
      'Drafts a tailored freelance proposal from the job post you are viewing. You review and send.',
    permissions: ['storage', 'sidePanel', 'activeTab', 'scripting'],
    host_permissions: [],
    action: {
      default_title: 'ProposalPilot',
    },
    icons: {
      '16': 'icon/16.png',
      '32': 'icon/32.png',
      '48': 'icon/48.png',
      '128': 'icon/128.png',
    },
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      if (manifest.content_scripts?.[0]) {
        manifest.content_scripts[0].matches = [...SITE_MATCHES];
      }
    },
    'build:before': (wxt) => {
      if (wxt.config.mode !== 'production') return;
      const env = { ...loadEnv('production', wxt.config.root, 'VITE_'), ...process.env };
      const api = env.VITE_API_BASE_URL ?? '';
      if (!api.startsWith('https://')) {
        throw new Error(
          'Production builds require VITE_API_BASE_URL set to an https:// URL ' +
            '(env var or extension/.env.production)',
        );
      }
    },
  },
});
