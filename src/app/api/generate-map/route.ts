import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignMap } from '@/lib/aiDm/mapGeneratorV2';

export async function POST(request: NextRequest) {
  let width = 25;
  let height = 20;
  
  try {
    const body = await request.json();
    const { campaignPrompt, width: reqWidth, height: reqHeight } = body;
    
    width = reqWidth || 25;
    height = reqHeight || 20;

    if (!campaignPrompt || typeof campaignPrompt !== 'string') {
      return NextResponse.json(
        { error: 'Campaign prompt is required' },
        { status: 400 }
      );
    }

    console.log('[API] Generating map for prompt:', campaignPrompt.substring(0, 50) + '...');

    const gridMap = await generateCampaignMap(
      campaignPrompt,
      width,
      height
    );

    return NextResponse.json({ gridMap });
  } catch (error) {
    console.error('[API] Map generation failed:', error);
    
    // Return fallback map instead of error
    const { createFallbackDungeon } = await import('@/lib/aiDm/mapGeneratorV2');
    const fallbackMap = createFallbackDungeon(width, height);
    
    return NextResponse.json({ gridMap: fallbackMap });
  }
}
