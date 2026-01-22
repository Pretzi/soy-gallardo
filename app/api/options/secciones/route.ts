import { NextResponse } from 'next/server';
import { getSecciones } from '@/lib/csv';

export async function GET() {
  try {
    const secciones = getSecciones();
    return NextResponse.json({ secciones });
  } catch (error) {
    console.error('Error in /api/options/secciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener secciones' },
      { status: 500 }
    );
  }
}

// Enable caching
export const revalidate = 3600; // Cache for 1 hour
