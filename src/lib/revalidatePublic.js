import { revalidatePath } from 'next/cache';

// ล้าง cache หน้าสาธารณะ (ISR) หลังแก้ข้อมูลสถานที่ เพื่อให้ผู้ชมเห็นข้อมูลใหม่ทันที
export function revalidatePublicPages() {
  try {
    revalidatePath('/');
    revalidatePath('/places');
  } catch (error) {
    console.error('revalidatePublicPages', error);
  }
}
