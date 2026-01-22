import { NextRequest, NextResponse } from 'next/server';
import { createEntry, listEntries, folioExists } from '@/lib/aws/dynamo';
import { entryCreateSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = entryCreateSchema.parse(body);

    // Check if folio already exists
    const exists = await folioExists(validatedData.folio);
    if (exists) {
      return NextResponse.json(
        { error: `El folio ${validatedData.folio} ya existe. Por favor, usa el siguiente folio disponible.` },
        { status: 409 } // 409 Conflict
      );
    }

    // Create entry
    const entry = await createEntry(validatedData);

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/entries:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al crear la entrada' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const lastKey = searchParams.get('lastKey');

    let lastEvaluatedKey;
    if (lastKey) {
      try {
        lastEvaluatedKey = JSON.parse(decodeURIComponent(lastKey));
      } catch (e) {
        console.error('Invalid lastKey:', e);
      }
    }

    const result = await listEntries(limit, lastEvaluatedKey);

    return NextResponse.json({
      entries: result.entries,
      lastEvaluatedKey: result.lastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(result.lastEvaluatedKey))
        : null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/entries:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener entradas' },
      { status: 500 }
    );
  }
}
