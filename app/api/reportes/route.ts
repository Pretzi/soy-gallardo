import { NextRequest, NextResponse } from 'next/server';
import { createReporte, listReportes } from '@/lib/aws/reportes';
import { uploadImageToS3 } from '@/lib/aws/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const tipo = formData.get('tipo') as string;
    const descripcion = formData.get('descripcion') as string;
    const nombre = formData.get('nombre') as string;
    const telefono = formData.get('telefono') as string | null;
    const email = formData.get('email') as string | null;
    const calle = formData.get('calle') as string;
    const colonia = formData.get('colonia') as string | null;
    const referencia = formData.get('referencia') as string | null;

    if (!tipo || !nombre || !calle) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Upload photos
    const fotosFiles = formData.getAll('fotos') as File[];
    const fotosUrls: string[] = [];
    const fotosS3Keys: string[] = [];

    for (const file of fotosFiles) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.endsWith('.png') ? '.png' : '.jpg';
        const { url, key } = await uploadImageToS3(buffer, `reporte-${Date.now()}${ext}`, 'reportes');
        fotosUrls.push(url);
        fotosS3Keys.push(key);
      }
    }

    const reporte = await createReporte({
      tipo,
      descripcion,
      nombre,
      ...(telefono ? { telefono } : {}),
      ...(email ? { email } : {}),
      calle,
      ...(colonia ? { colonia } : {}),
      ...(referencia ? { referencia } : {}),
      fotosUrls,
      fotosS3Keys,
    });

    return NextResponse.json({ folio: reporte.folio, id: reporte.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating reporte:', error);
    return NextResponse.json({ error: 'Error al crear el reporte' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Admin only
  const authToken = request.cookies.get('auth-token');
  if (!authToken || authToken.value !== 'authenticated') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const estado = searchParams.get('estado') || undefined;

  try {
    const reportes = await listReportes({ tipo, estado });
    return NextResponse.json({ reportes });
  } catch (error) {
    console.error('Error listing reportes:', error);
    return NextResponse.json({ error: 'Error al obtener los reportes' }, { status: 500 });
  }
}
