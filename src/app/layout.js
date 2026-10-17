import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata = {
  title: 'หล่มสักทริป AI | ผู้ช่วยอัจฉริยะจัดทริปท่องเที่ยว อำเภอหล่มสัก จ.เพชรบูรณ์',
  description:
    'เว็บแอปพลิเคชันผู้ช่วยอัจฉริยะจัดทริปท่องเที่ยว อำเภอหล่มสัก จังหวัดเพชรบูรณ์ ค้นหาสถานที่ ดูแผนที่ และให้ AI จัดแผนเที่ยวตามวัน งบประมาณ และความสนใจ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
