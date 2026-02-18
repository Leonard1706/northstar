import { NextRequest, NextResponse } from 'next/server';
import {
  readReflection,
  writeReflection,
  getAllReflections,
  getReflectionsForYear,
  getRecentReflections,
} from '@/lib/reflections';
import type { ReflectionFrontmatter } from '@/types';

// GET - Read reflection(s)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  const year = searchParams.get('year');
  const recent = searchParams.get('recent');

  try {
    // Get recent reflections
    if (recent) {
      const limit = parseInt(recent) || 5;
      const reflections = await getRecentReflections(limit);
      return NextResponse.json({ success: true, data: reflections });
    }

    // Get single reflection by path
    if (path) {
      const reflection = await readReflection(path);
      if (!reflection) {
        return NextResponse.json({ success: false, error: 'Reflection not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: reflection });
    }

    // Get all reflections for a year
    if (year) {
      const reflections = await getReflectionsForYear(parseInt(year));
      return NextResponse.json({ success: true, data: reflections });
    }

    // Get all reflections
    const reflections = await getAllReflections();
    return NextResponse.json({ success: true, data: reflections });
  } catch (error) {
    console.error('Error reading reflection:', error);
    return NextResponse.json({ success: false, error: 'Failed to read reflection' }, { status: 500 });
  }
}

// POST - Create/update reflection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, frontmatter, content } = body as {
      path: string;
      frontmatter: ReflectionFrontmatter;
      content: string;
    };

    if (!path || !frontmatter || !content) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const success = await writeReflection(path, frontmatter, content);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to write reflection' }, { status: 500 });
    }

    // Return the updated reflection
    const reflection = await readReflection(path);
    return NextResponse.json({ success: true, data: reflection });
  } catch (error) {
    console.error('Error writing reflection:', error);
    return NextResponse.json({ success: false, error: 'Failed to write reflection' }, { status: 500 });
  }
}
