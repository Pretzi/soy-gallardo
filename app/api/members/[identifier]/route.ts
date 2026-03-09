import { NextRequest, NextResponse } from 'next/server';
import { getEntryByPublicId } from '@/lib/aws/dynamo';

// Public route: no auth required. Resolves only by publicId (unguessable).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    if (!identifier) {
      return NextResponse.json(
        { error: 'Identificador requerido' },
        { status: 400 }
      );
    }

    const entry = await getEntryByPublicId(identifier);

    if (!entry) {
      return NextResponse.json(
        { error: 'Miembro no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error in GET /api/members/[identifier]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener el miembro' },
      { status: 500 }
    );
  }
}
