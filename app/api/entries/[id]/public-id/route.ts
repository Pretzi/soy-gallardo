import { NextRequest, NextResponse } from 'next/server';
import { ensureEntryPublicId } from '@/lib/aws/dynamo';

// Ensures the entry has a publicId (generates and saves if missing). Returns the publicId.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await ensureEntryPublicId(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ publicId: entry.publicId });
  } catch (error: any) {
    console.error('Error in POST /api/entries/[id]/public-id:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar enlace público' },
      { status: 500 }
    );
  }
}
