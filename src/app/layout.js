import { Inter } from 'next/font/google'
import RootLayout from './RootLayout';
import { AuthProvider } from '../hooks/Auth';

const inter = Inter({ subsets: ['latin'] })
const APP_NAME = "sp";

export const metadata = {
  title: APP_NAME
};

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RootLayout>
            {children}
          </RootLayout>
        </AuthProvider>
      </body>
    </html>
  )
}