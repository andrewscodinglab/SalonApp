import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
  return new NextResponse(null, { status: 200 });
} 