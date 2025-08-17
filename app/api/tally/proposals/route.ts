import { NextRequest, NextResponse } from 'next/server';
import { TallyService } from '@/services/tally';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const proposals = await TallyService.getCompoundProposals(limit);
    
    return NextResponse.json(proposals);
  } catch (error) {
    console.error('Error fetching Tally proposals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}
