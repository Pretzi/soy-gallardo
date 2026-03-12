import { NextRequest, NextResponse } from 'next/server';
import { getLocalidades } from '@/lib/csv';
import { getCustomLocalidades, addCustomLocalidad, customLocalidadExists } from '@/lib/aws/dynamo';

export async function GET() {
  try {
    const fromCsv = getLocalidades();
    const custom = await getCustomLocalidades();
    const combined = [...new Set([...fromCsv, ...custom])].sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    return NextResponse.json({ localidades: combined });
  } catch (error) {
    console.error('Error in GET /api/options/localidades:', error);
    return NextResponse.json(
      { error: 'Error al obtener localidades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { error: 'El nombre de la comunidad es requerido' },
        { status: 400 }
      );
    }

    const exists = await customLocalidadExists(name);
    if (exists) {
      return NextResponse.json(
        { error: 'Esa comunidad ya existe', localidad: name },
        { status: 200 }
      );
    }

    const added = await addCustomLocalidad(name);
    const custom = await getCustomLocalidades();
    const fromCsv = getLocalidades();
    const combined = [...new Set([...fromCsv, ...custom])].sort((a, b) =>
      a.localeCompare(b, 'es')
    );
    return NextResponse.json(
      { localidad: added, localidades: combined },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/options/localidades:', error);
    return NextResponse.json(
      { error: error.message || 'Error al agregar comunidad' },
      { status: 500 }
    );
  }
}
