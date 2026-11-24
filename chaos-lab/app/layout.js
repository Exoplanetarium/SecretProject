import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
export const metadata={title:'Little Circuit',description:'Build circuits on a 3D wooden workbench.'};
export default function RootLayout({children}){return <html lang="en"><body><ClerkProvider>{children}</ClerkProvider></body></html>;}