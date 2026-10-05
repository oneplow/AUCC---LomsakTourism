/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.2.36', 'localhost'],
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
