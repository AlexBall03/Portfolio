import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

/** The three typefaces, shared by both root layouts (public site and admin). */
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/** CSS variable classes for <html>; globals.css maps them to font-display / -body / -mono. */
export const fontVariables = `${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`;
