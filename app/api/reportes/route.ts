import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createReporte, listReportes } from '@/lib/aws/reportes';
import { uploadImageToS3 } from '@/lib/aws/s3';
import { getReportCategory, getReportSubcategory } from '@/lib/report-types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const categoria = formData.get('categoria') as string | null;
    const subcategoria = formData.get('subcategoria') as string | null;
    const tipo = formData.get('tipo') as string | null;
    const descripcion = formData.get('descripcion') as string;
    const nombre = formData.get('nombre') as string;
    const telefono = formData.get('telefono') as string | null;
    const email = formData.get('email') as string | null;
    const calle = formData.get('calle') as string;
    const colonia = formData.get('colonia') as string | null;
    const referencia = formData.get('referencia') as string | null;

    const hasNewClassification = Boolean(categoria && subcategoria);
    const hasLegacyClassification = Boolean(tipo);

    if ((!hasNewClassification && !hasLegacyClassification) || !nombre || !calle) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (hasNewClassification) {
      const category = getReportCategory(categoria!);
      const subcategory = getReportSubcategory(categoria!, subcategoria!);
      if (!category || !subcategory) {
        return NextResponse.json({ error: 'Categoría o subcategoría inválida' }, { status: 400 });
      }
    }

    const fotosFiles = formData.getAll('fotos') as File[];
    const fotosUrls: string[] = [];
    const fotosS3Keys: string[] = [];

    for (const file of fotosFiles) {
      if (file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const normalized = await sharp(buffer)
          .rotate() // apply EXIF orientation and strip metadata
          .jpeg({ quality: 90 })
          .toBuffer();
        const { url, key } = await uploadImageToS3(normalized, `reporte-${Date.now()}.jpg`, 'reportes');
        fotosUrls.push(url);
        fotosS3Keys.push(key);
      }
    }

    const reporte = await createReporte({
      ...(hasNewClassification
        ? { categoria: categoria!, subcategoria: subcategoria! }
        : { tipo: tipo! }),
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
  const authToken = request.cookies.get('auth-token');
  if (!authToken || authToken.value !== 'authenticated') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const categoria = searchParams.get('categoria') || undefined;
  const estado = searchParams.get('estado') || undefined;

  try {
    const reportes = await listReportes({ tipo, categoria, estado });
    return NextResponse.json({ reportes });
  } catch (error) {
    console.error('Error listing reportes:', error);
    return NextResponse.json({ error: 'Error al obtener los reportes' }, { status: 500 });
  }
}
