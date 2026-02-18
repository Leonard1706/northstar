import { NextRequest, NextResponse } from 'next/server';
import { readGoal, writeGoal, getCurrentGoals, getGoalsForYear, getVisionForYear, updateTaskInContent } from '@/lib/goals';
import type { GoalFrontmatter } from '@/types';

// GET - Read goal(s)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  const year = searchParams.get('year');
  const current = searchParams.get('current');
  const vision = searchParams.get('vision');

  try {
    // Get current period goals
    if (current === 'true') {
      const goals = await getCurrentGoals();
      return NextResponse.json({ success: true, data: goals });
    }

    // Get vision for a specific year
    if (vision) {
      const visionGoal = await getVisionForYear(parseInt(vision));
      return NextResponse.json({ success: true, data: visionGoal });
    }

    // Get single goal by path
    if (path) {
      const goal = await readGoal(path);
      if (!goal) {
        return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: goal });
    }

    // Get all goals for a year
    if (year) {
      const goals = await getGoalsForYear(parseInt(year));
      return NextResponse.json({ success: true, data: goals });
    }

    return NextResponse.json({ success: false, error: 'Missing path or year parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error reading goal:', error);
    return NextResponse.json({ success: false, error: 'Failed to read goal' }, { status: 500 });
  }
}

// POST - Create/update goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, frontmatter, content } = body as {
      path: string;
      frontmatter: GoalFrontmatter;
      content: string;
    };

    if (!path || !frontmatter || !content) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const success = await writeGoal(path, frontmatter, content);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to write goal' }, { status: 500 });
    }

    // Return the updated goal
    const goal = await readGoal(path);
    return NextResponse.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error writing goal:', error);
    return NextResponse.json({ success: false, error: 'Failed to write goal' }, { status: 500 });
  }
}

// PATCH - Update task completion
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, taskId, completed } = body as {
      path: string;
      taskId: string;
      completed: boolean;
    };

    if (!path || !taskId || completed === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Read current goal
    const goal = await readGoal(path);
    if (!goal) {
      return NextResponse.json({ success: false, error: 'Goal not found' }, { status: 404 });
    }

    // Update content
    const updatedContent = updateTaskInContent(goal.content, taskId, completed);

    // Update status if needed
    const updatedFrontmatter = { ...goal.frontmatter };
    if (completed) {
      updatedFrontmatter.status = 'in-progress';
    }

    // Write updated goal
    const success = await writeGoal(path, updatedFrontmatter, updatedContent);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
    }

    // Return updated goal
    const updatedGoal = await readGoal(path);
    return NextResponse.json({ success: true, data: updatedGoal });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}
