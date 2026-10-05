import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata = {
  title: "เที่ยวหล่มสัก | ท่องเที่ยวอำเภอหล่มสัก จ.เพชรบูรณ์",
  description: "ค้นพบสถานที่ท่องเที่ยวอำเภอหล่มสัก จังหวัดเพชรบูรณ์ วัด น้ำตก จุดชมวิว ตลาด และวางแผนทริปด้วย AI",
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
