import { NextResponse } from 'next/server';
import { getLocalidades } from '@/lib/csv';

export async function GET() {
  try {
    const localidades = getLocalidades();
    return NextResponse.json({ localidades });
  } catch (error) {
    console.error('Error in /api/options/localidades:', error);
    return NextResponse.json(
      { error: 'Error al obtener localidades' },
      { status: 500 }
    );
  }
}

// Enable caching
export const revalidate = 3600; // Cache for 1 hour
