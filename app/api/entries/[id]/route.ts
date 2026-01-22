import { NextRequest, NextResponse } from 'next/server';
import { getEntry, updateEntry } from '@/lib/aws/dynamo';
import { entryUpdateSchema } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await getEntry(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error in GET /api/entries/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener la entrada' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = entryUpdateSchema.parse(body);

    // Update entry
    const entry = await updateEntry(id, validatedData);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error in PUT /api/entries/[id]:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al actualizar la entrada' },
      { status: 500 }
    );
  }
}
