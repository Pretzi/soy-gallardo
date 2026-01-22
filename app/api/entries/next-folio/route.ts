import { NextResponse } from 'next/server';
import { getLatestFolio } from '@/lib/aws/dynamo';

export async function GET() {
  try {
    const nextFolio = await getLatestFolio();
    
    return NextResponse.json({ folio: nextFolio });
  } catch (error: any) {
    console.error('Error in /api/entries/next-folio:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener el siguiente folio' },
      { status: 500 }
    );
  }
}
