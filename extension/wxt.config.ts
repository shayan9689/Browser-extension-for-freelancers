import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import { SITE_MATCHES } from './src/shared/sites';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'ProposalPilot',
    version: '0.1.0',
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
  // Ensure content script matches stay in sync with sites.ts (used by content entry)
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      if (manifest.content_scripts?.[0]) {
        manifest.content_scripts[0].matches = [...SITE_MATCHES];
      }
    },
  },
});
