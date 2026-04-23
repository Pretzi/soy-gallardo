import { NextRequest, NextResponse } from 'next/server';
import { getReporte, updateReporte } from '@/lib/aws/reportes';

function checkAuth(request: NextRequest): boolean {
  const authToken = request.cookies.get('auth-token');
  return authToken?.value === 'authenticated';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const reporte = await getReporte(id);
    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ reporte });
  } catch (error) {
    console.error('Error getting reporte:', error);
    return NextResponse.json({ error: 'Error al obtener el reporte' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { estado, notasAdmin } = body;

    const updated = await updateReporte(id, {
      ...(estado ? { estado } : {}),
      ...(notasAdmin !== undefined ? { notasAdmin } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ reporte: updated });
  } catch (error) {
    console.error('Error updating reporte:', error);
    return NextResponse.json({ error: 'Error al actualizar el reporte' }, { status: 500 });
  }
}
