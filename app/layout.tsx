import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Breathe Better · Air quality intelligence',description:'Understand the air around you. Explore air quality, compare locations and plan outdoor time with clearly labelled forecasts and station observations.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
