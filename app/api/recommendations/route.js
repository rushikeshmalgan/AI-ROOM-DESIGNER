import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { eq } from 'drizzle-orm';

// Popular design styles that are trending
const TRENDING_STYLES = [
  { id: 'trend-1', name: 'Scandinavian', description: 'Clean lines and minimalist approach with natural elements', imageUrl: '/styles/scandinavian.jpg' },
  { id: 'trend-2', name: 'Industrial', description: 'Raw materials and exposed structural elements', imageUrl: '/styles/industrial.jpg' },
  { id: 'trend-3', name: 'Mid-Century Modern', description: 'Retro-inspired design with clean lines and organic forms', imageUrl: '/styles/mid-century.jpg' },
  { id: 'trend-4', name: 'Bohemian', description: 'Eclectic and free-spirited with rich patterns and textures', imageUrl: '/styles/bohemian.jpg' },
  { id: 'trend-5', name: 'Minimalist', description: 'Simplicity, clean lines, and monochromatic color palette', imageUrl: '/styles/minimalist.jpg' },
  { id: 'trend-6', name: 'Coastal', description: 'Beach-inspired with light colors and natural textures', imageUrl: '/styles/coastal.jpg' },
];

// Design style categories for recommendations
const DESIGN_CATEGORIES = {
  'living room': ['Scandinavian', 'Industrial', 'Mid-Century Modern', 'Bohemian', 'Minimalist', 'Coastal'],
  'bedroom': ['Scandinavian', 'Bohemian', 'Minimalist', 'Coastal', 'Modern', 'Traditional'],
  'kitchen': ['Industrial', 'Scandinavian', 'Modern', 'Farmhouse', 'Contemporary', 'Minimalist'],
  'bathroom': ['Modern', 'Minimalist', 'Industrial', 'Scandinavian', 'Contemporary', 'Traditional'],
  'office': ['Industrial', 'Mid-Century Modern', 'Minimalist', 'Contemporary', 'Modern', 'Traditional'],
  'dining room': ['Mid-Century Modern', 'Industrial', 'Scandinavian', 'Minimalist', 'Traditional', 'Contemporary'],
};

// Generate personalized recommendations based on user's design history
function generatePersonalizedRecommendations(userDesigns) {
  // If user has no designs, return some default recommendations
  if (!userDesigns || userDesigns.length === 0) {
    return [
      { id: 'rec-1', name: 'Modern Living Room', description: 'Clean lines with contemporary furniture', imageUrl: '/recommendations/modern-living.jpg' },
      { id: 'rec-2', name: 'Cozy Bedroom', description: 'Warm tones and soft textures for ultimate comfort', imageUrl: '/recommendations/cozy-bedroom.jpg' },
      { id: 'rec-3', name: 'Minimalist Kitchen', description: 'Sleek and functional with hidden storage', imageUrl: '/recommendations/minimalist-kitchen.jpg' },
      { id: 'rec-4', name: 'Luxurious Bathroom', description: 'Spa-like retreat with premium fixtures', imageUrl: '/recommendations/luxury-bathroom.jpg' },
    ];
  }

  // Analyze user's design preferences
  const roomTypeCounts = {};
  const designStyleCounts = {};
  
  userDesigns.forEach(design => {
    // Count room types
    roomTypeCounts[design.roomType] = (roomTypeCounts[design.roomType] || 0) + 1;
    
    // Count design styles
    designStyleCounts[design.designType] = (designStyleCounts[design.designType] || 0) + 1;
  });
  
  // Find most common room type and design style
  const favoriteRoomType = Object.entries(roomTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'living room';
  const favoriteDesignStyle = Object.entries(designStyleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Modern';
  
  // Generate recommendations based on user preferences
  const recommendations = [];
  
  // Recommend their favorite style in different room types
  Object.keys(DESIGN_CATEGORIES).forEach((roomType, index) => {
    if (roomType !== favoriteRoomType && index < 3) { // Limit to 3 different room types
      recommendations.push({
        id: `rec-room-${index}`,
        name: `${favoriteDesignStyle} ${roomType.charAt(0).toUpperCase() + roomType.slice(1)}`,
        description: `Your favorite ${favoriteDesignStyle} style applied to a ${roomType}`,
        imageUrl: `/recommendations/${roomType.replace(' ', '-')}-${favoriteDesignStyle.toLowerCase()}.jpg`,
        isPersonalized: true
      });
    }
  });
  
  // Recommend different styles for their favorite room type
  const roomStyles = DESIGN_CATEGORIES[favoriteRoomType] || DESIGN_CATEGORIES['living room'];
  roomStyles.forEach((style, index) => {
    if (style !== favoriteDesignStyle && index < 3) { // Limit to 3 different styles
      recommendations.push({
        id: `rec-style-${index}`,
        name: `${style} ${favoriteRoomType.charAt(0).toUpperCase() + favoriteRoomType.slice(1)}`,
        description: `A fresh ${style} approach to your favorite room type`,
        imageUrl: `/recommendations/${favoriteRoomType.replace(' ', '-')}-${style.toLowerCase()}.jpg`,
        isPersonalized: true
      });
    }
  });
  
  // If we don't have enough recommendations, add some general ones
  while (recommendations.length < 4) {
    const randomRoomType = Object.keys(DESIGN_CATEGORIES)[Math.floor(Math.random() * Object.keys(DESIGN_CATEGORIES).length)];
    const randomStyle = DESIGN_CATEGORIES[randomRoomType][Math.floor(Math.random() * DESIGN_CATEGORIES[randomRoomType].length)];
    
    const recommendation = {
      id: `rec-random-${recommendations.length}`,
      name: `${randomStyle} ${randomRoomType.charAt(0).toUpperCase() + randomRoomType.slice(1)}`,
      description: `Explore this popular ${randomStyle} design for your ${randomRoomType}`,
      imageUrl: `/recommendations/${randomRoomType.replace(' ', '-')}-${randomStyle.toLowerCase()}.jpg`,
      isPersonalized: false
    };
    
    // Check if this recommendation is already in the list
    const isDuplicate = recommendations.some(rec => rec.name === recommendation.name);
    if (!isDuplicate) {
      recommendations.push(recommendation);
    }
  }
  
  return recommendations.slice(0, 6); // Return at most 6 recommendations
}

export async function GET() {
  try {
    // Get current authenticated user
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch user's designs from the database
    const userDesigns = await db
      .select()
      .from(designs)
      .where(eq(designs.userId, user.id))
      .orderBy(designs.createdAt, 'desc');
    
    // Generate personalized recommendations
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