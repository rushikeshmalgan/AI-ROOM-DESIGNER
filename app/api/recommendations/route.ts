import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { eq, desc } from 'drizzle-orm';

interface TrendingStyle {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface DesignCategory {
  [roomType: string]: string[];
}

interface Recommendation {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isPersonalized?: boolean;
}

const TRENDING_STYLES: TrendingStyle[] = [
  { id: 'trend-1', name: 'Scandinavian', description: 'Clean lines and minimalist approach with natural elements', imageUrl: '/styles/scandinavian.jpg' },
  { id: 'trend-2', name: 'Industrial', description: 'Raw materials and exposed structural elements', imageUrl: '/styles/industrial.jpg' },
  { id: 'trend-3', name: 'Mid-Century Modern', description: 'Retro-inspired design with clean lines and organic forms', imageUrl: '/styles/mid-century.jpg' },
  { id: 'trend-4', name: 'Bohemian', description: 'Eclectic and free-spirited with rich patterns and textures', imageUrl: '/styles/bohemian.jpg' },
  { id: 'trend-5', name: 'Minimalist', description: 'Simplicity, clean lines, and monochromatic color palette', imageUrl: '/styles/minimalist.jpg' },
  { id: 'trend-6', name: 'Coastal', description: 'Beach-inspired with light colors and natural textures', imageUrl: '/styles/coastal.jpg' },
];

const DESIGN_CATEGORIES: DesignCategory = {
  'living room': ['Scandinavian', 'Industrial', 'Mid-Century Modern', 'Bohemian', 'Minimalist', 'Coastal'],
  'bedroom': ['Scandinavian', 'Bohemian', 'Minimalist', 'Coastal', 'Modern', 'Traditional'],
  'kitchen': ['Industrial', 'Scandinavian', 'Modern', 'Farmhouse', 'Contemporary', 'Minimalist'],
  'bathroom': ['Modern', 'Minimalist', 'Industrial', 'Scandinavian', 'Contemporary', 'Traditional'],
  'office': ['Industrial', 'Mid-Century Modern', 'Minimalist', 'Contemporary', 'Modern', 'Traditional'],
  'dining room': ['Mid-Century Modern', 'Industrial', 'Scandinavian', 'Minimalist', 'Traditional', 'Contemporary'],
};

function generatePersonalizedRecommendations(userDesigns: Array<Record<string, unknown>>): Recommendation[] {
  if (!userDesigns || userDesigns.length === 0) {
    return [
      { id: 'rec-1', name: 'Modern Living Room', description: 'Clean lines with contemporary furniture', imageUrl: '/recommendations/modern-living.jpg' },
      { id: 'rec-2', name: 'Cozy Bedroom', description: 'Warm tones and soft textures for ultimate comfort', imageUrl: '/recommendations/cozy-bedroom.jpg' },
      { id: 'rec-3', name: 'Minimalist Kitchen', description: 'Sleek and functional with hidden storage', imageUrl: '/recommendations/minimalist-kitchen.jpg' },
      { id: 'rec-4', name: 'Luxurious Bathroom', description: 'Spa-like retreat with premium fixtures', imageUrl: '/recommendations/luxury-bathroom.jpg' },
    ];
  }

  const roomTypeCounts: Record<string, number> = {};
  const designStyleCounts: Record<string, number> = {};

  userDesigns.forEach(design => {
    const roomType = String(design.roomType ?? '');
    const designType = String(design.designType ?? '');
    roomTypeCounts[roomType] = (roomTypeCounts[roomType] || 0) + 1;
    designStyleCounts[designType] = (designStyleCounts[designType] || 0) + 1;
  });

  const favoriteRoomType = Object.entries(roomTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'living room';
  const favoriteDesignStyle = Object.entries(designStyleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Modern';

  const recommendations: Recommendation[] = [];

  Object.keys(DESIGN_CATEGORIES).forEach((roomType, index) => {
    if (roomType !== favoriteRoomType && index < 3) {
      recommendations.push({
        id: `rec-room-${index}`,
        name: `${favoriteDesignStyle} ${roomType.charAt(0).toUpperCase() + roomType.slice(1)}`,
        description: `Your favorite ${favoriteDesignStyle} style applied to a ${roomType}`,
        imageUrl: `/recommendations/${roomType.replace(' ', '-')}-${favoriteDesignStyle.toLowerCase()}.jpg`,
        isPersonalized: true
      });
    }
  });

  const roomStyles = DESIGN_CATEGORIES[favoriteRoomType] || DESIGN_CATEGORIES['living room'];
  roomStyles.forEach((style, index) => {
    if (style !== favoriteDesignStyle && index < 3) {
      recommendations.push({
        id: `rec-style-${index}`,
        name: `${style} ${favoriteRoomType.charAt(0).toUpperCase() + favoriteRoomType.slice(1)}`,
        description: `A fresh ${style} approach to your favorite room type`,
        imageUrl: `/recommendations/${favoriteRoomType.replace(' ', '-')}-${style.toLowerCase()}.jpg`,
        isPersonalized: true
      });
    }
  });

  while (recommendations.length < 4) {
    const randomRoomType = Object.keys(DESIGN_CATEGORIES)[Math.floor(Math.random() * Object.keys(DESIGN_CATEGORIES).length)];
    const randomStyle = DESIGN_CATEGORIES[randomRoomType][Math.floor(Math.random() * DESIGN_CATEGORIES[randomRoomType].length)];

    const recommendation: Recommendation = {
      id: `rec-random-${recommendations.length}`,
      name: `${randomStyle} ${randomRoomType.charAt(0).toUpperCase() + randomRoomType.slice(1)}`,
      description: `Explore this popular ${randomStyle} design for your ${randomRoomType}`,
      imageUrl: `/recommendations/${randomRoomType.replace(' ', '-')}-${randomStyle.toLowerCase()}.jpg`,
      isPersonalized: false
    };

    const isDuplicate = recommendations.some(rec => rec.name === recommendation.name);
    if (!isDuplicate) {
      recommendations.push(recommendation);
    }
  }

  return recommendations.slice(0, 6);
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDesigns = await db
      .select()
      .from(designs)
      .where(eq(designs.userId, user.id))
      .orderBy(desc(designs.createdAt));

    const personalizedRecommendations = generatePersonalizedRecommendations(userDesigns);

    return NextResponse.json({
      success: true,
      recommendations: {
        personalized: personalizedRecommendations,
        trending: TRENDING_STYLES
      }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
