import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '../src/index.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'LCA DADOS - Dashboard',
  description: 'Sistema de gestão para LCA DADOS',
};

import { Providers } from '../components/Providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <Providers>
          <div id="root">
            {children}
          </div>
        </Providers>
        <Toaster theme="light" position="top-right" />
      </body>
    </html>
  );
}
