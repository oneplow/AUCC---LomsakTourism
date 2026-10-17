/** @type {import('next').NextConfig} */
const nextConfig = {
  // ใช้เฉพาะตอน next dev: อนุญาตทุกเครื่องในวง LAN ไม่ต้องแก้เมื่อ IP เปลี่ยน
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '*.local'],
  images: {
    // รูปสถานที่มาจาก URL ที่ admin กรอกเอง จึงอนุญาตทุก host ที่เป็น https
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
