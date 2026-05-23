import { NextRequest, NextResponse } from 'next/server';
import { getMunicipioConfig, saveMunicipioConfig } from '@/lib/aws/municipio-config';
import type { MunicipioConfig } from '@/lib/municipio-config';

function checkAuth(request: NextRequest): boolean {
  const authToken = request.cookies.get('auth-token');
  return authToken?.value === 'authenticated';
}

export async function GET() {
  try {
    const config = await getMunicipioConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching municipio config:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const config = body.config as MunicipioConfig;
    if (!config?.alcaldeName || !config?.directores?.length) {
      return NextResponse.json({ error: 'Configuración inválida' }, { status: 400 });
    }

    const saved = await saveMunicipioConfig(config);
    return NextResponse.json({ config: saved });
  } catch (error) {
    console.error('Error saving municipio config:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
