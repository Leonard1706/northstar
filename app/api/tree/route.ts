import { NextRequest, NextResponse } from 'next/server';
import { buildGoalTree } from '@/lib/goals';

// GET - Build and return goal tree
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  try {
    const tree = await buildGoalTree(parseInt(year));
    return NextResponse.json({ success: true, data: tree });
  } catch (error) {
    console.error('Error building goal tree:', error);
    return NextResponse.json({ success: false, error: 'Failed to build goal tree' }, { status: 500 });
  }
}
