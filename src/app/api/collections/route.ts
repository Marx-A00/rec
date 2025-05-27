import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('public') === 'true';
    
    if (publicOnly) {
      // Get public collections
      const collections = await prisma.collection.findMany({
        where: { isPublic: true },
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { albums: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      return NextResponse.json({ collections });
    }
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's collections
    const collections = await prisma.collection.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { albums: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    return NextResponse.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { name, description, isPublic = false } = await request.json();
    
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }
    
    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        isPublic,
        userId: session.user.id
      },
      include: {
        _count: { select: { albums: true } }
      }
    });
    
    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 