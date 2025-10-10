'use client';

import { Card, Title, Text, Flex } from '@tremor/react';

/**
 * 관리자 종합 분석 대시보드
 *
 * @purpose 데이터 누적 안내 페이지
 * @context 고급 분석 기능은 데이터 누적 후 추가 예정
 */

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">종합 분석 대시보드</h1>
          <p className="mt-1 text-sm text-gray-500">데이터 수집 및 분석 준비 중</p>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* 안내 메시지 */}
        <Card>
          <div className="p-8 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <div className="mb-4">
              <span className="text-6xl">📊</span>
            </div>
            <Title className="text-blue-900 mb-4">분석 대시보드 준비 중</Title>
            <Text className="text-blue-700 mb-6 text-lg">
              현재 기본 데이터를 수집하고 있습니다.
            </Text>
            <div className="max-w-2xl mx-auto text-left space-y-4">
              <div className="p-4 bg-white rounded-lg">
                <Text className="font-semibold text-gray-900 mb-2">🔄 현재 수집 중인 데이터</Text>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>페이지 방문 기록 (page-visits)</li>
                  <li>전환 이벤트 (conversions)</li>
                  <li>사용자 세션 정보</li>
                  <li>UTM 파라미터 데이터</li>
                </ul>
              </div>

              <div className="p-4 bg-white rounded-lg">
                <Text className="font-semibold text-gray-900 mb-2">⏳ 데이터 누적 후 제공될 기능</Text>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>실시간 접속자 현황</li>
                  <li>전환 퍼널 분석</li>
                  <li>UTM 캠페인 성과 분석</li>
                  <li>시간대별 트래픽 분석</li>
                  <li>랜딩 페이지 및 이탈 페이지 분석</li>
                  <li>사용자 여정 맵</li>
                  <li>코호트 분석 & 재방문율</li>
                </ul>
              </div>

              <div className="p-4 bg-white rounded-lg">
                <Text className="font-semibold text-gray-900 mb-2">📌 다음 단계</Text>
                <Text className="text-gray-700">
                  충분한 데이터가 수집되면 (최소 7일 이상의 활동 데이터),
                  위의 고급 분석 기능들이 순차적으로 활성화됩니다.
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* 기술 정보 */}
        <Card>
          <Flex>
            <div>
              <Title className="text-gray-900 mb-2">🛠️ 기술 스택</Title>
              <Text className="text-gray-700">
                <strong>백엔드:</strong> Next.js API Routes, MongoDB Atlas
              </Text>
              <Text className="text-gray-700">
                <strong>프론트엔드:</strong> React, Tremor Charts, Recharts
              </Text>
              <Text className="text-gray-700">
                <strong>분석 도구:</strong> 자체 개발 Analytics Engine
              </Text>
            </div>
          </Flex>
        </Card>
      </div>
    </div>
  );
}
