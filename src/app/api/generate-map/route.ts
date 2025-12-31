import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignMap } from '@/lib/aiDm/mapGeneratorV2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignPrompt, width, height } = body;

    if (!campaignPrompt || typeof campaignPrompt !== 'string') {
      return NextResponse.json(
        { error: 'Campaign prompt is required' },
        { status: 400 }
      );
    }

    console.log('[API] Generating map for prompt:', campaignPrompt.substring(0, 50) + '...');

    const gridMap = await generateCampaignMap(
      campaignPrompt,
      width || 25,
      height || 20
    );

    return NextResponse.json({ gridMap });
  } catch (error) {
    console.error('[API] Map generation failed:', error);
    
    // Return fallback map instead of error
    const { createFallbackDungeon } = await import('@/lib/aiDm/mapGeneratorV2');
    const fallbackMap = createFallbackDungeon(width || 25, height || 20);
    
    return NextResponse.json({ gridMap: fallbackMap });
  }
}
