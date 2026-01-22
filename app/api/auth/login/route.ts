import { NextRequest, NextResponse } from 'next/server';

const CORRECT_PASSWORD = 'PRETZI';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === CORRECT_PASSWORD) {
      const response = NextResponse.json({ success: true }, { status: 200 });
      
      // Set HTTP-only cookie for authentication
      response.cookies.set('auth-token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return response;
    } else {
      return NextResponse.json(
        { error: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
