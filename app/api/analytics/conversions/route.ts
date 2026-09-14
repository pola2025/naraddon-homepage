import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { handleAuthError, requireAdmin } from '@/lib/auth/guards';
import { parseAnalyticsDateRange } from '@/lib/bounded-analytics';
import {
  buildDescendingDateCursorFilter,
  parseListRequest,
  takePage,
} from '@/lib/bounded-read';

type ConversionDocument = {
  readonly _id: { toString(): string };
  readonly timestamp: Date | string;
  readonly [key: string]: unknown;
};

/**
 * 전환 이벤트 저장 API
 *
 * @purpose 사용자 전환 이벤트를 MongoDB에 저장
 * @context 전환 퍼널 분석, 캠페인 성과 측정에 사용
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      userId,
      conversionType,
      value,
      metadata,
      funnelStep,
      timestamp,
    } = body;

    // 필수 필드 검증
    if (!sessionId || !conversionType) {
      return NextResponse.json(
        { error: 'sessionId and conversionType are required' },
        { status: 400 }
      );
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');
    const conversionsCollection = db.collection('conversions');

    // 전환 이벤트 저장
    const result = await conversionsCollection.insertOne({
      sessionId,
      userId: userId || null,
      conversionType,
      value: value || 0,
      metadata: metadata || {},
      funnelStep: funnelStep || null,
      timestamp: new Date(timestamp),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      conversionId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('[Analytics/Conversions] Error:', error);

    // 전환 추적 실패해도 사용자 경험에 영향 없도록 200 반환
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

/**
 * 전환 이벤트 조회 API
 *
 * @purpose 관리자가 전환 이벤트 데이터를 조회
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const conversionType = searchParams.get('conversionType');
    const listRequestResult = parseListRequest(searchParams, { defaultLimit: 50, maxLimit: 100 });
    if (listRequestResult.kind === 'invalid') {
      return NextResponse.json({ error: listRequestResult.message }, { status: 400 });
    }
    const { limit, cursor } = listRequestResult.request;
    const dateRange = parseAnalyticsDateRange(searchParams);
    if (dateRange.kind === 'invalid') {
      return NextResponse.json({ error: dateRange.message }, { status: 400 });
    }

    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db('naraddon');
    const conversionsCollection = db.collection('conversions');

    // 쿼리 조건 생성
    const query: any = {};

    if (sessionId) {
      query.sessionId = sessionId;
    }

    if (conversionType) {
      query.conversionType = conversionType;
    }

    query.timestamp = { $gte: dateRange.start, $lte: dateRange.end };
    let queryFilter = query;
    if (cursor) {
      const cursorFilterResult = buildDescendingDateCursorFilter(
        cursor,
        'timestamp',
        (id) => new ObjectId(id)
      );
      if (cursorFilterResult.kind === 'invalid') {
        return NextResponse.json({ error: 'cursor is invalid' }, { status: 400 });
      }
      queryFilter = { $and: [query, cursorFilterResult.filter] };
    }

    // 전환 이벤트 조회
    const conversions = await conversionsCollection
      .find(queryFilter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(limit + 1)
      .toArray();
    const page = takePage<ConversionDocument>(conversions, limit, (conversion) => ({
      sortValue: new Date(conversion.timestamp).toISOString(),
      id: conversion._id.toString(),
    }));

    return NextResponse.json({
      success: true,
      conversions: page.items,
      total: null,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error('[Analytics/Conversions] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversions' },
      { status: 500 }
    );
  }
}
