'use client';

import { useState } from 'react';

/**
 * 연락처 정보 편집기
 *
 * @purpose 브랜드 페이지 연락처 섹션의 정보를 편집
 * @context 웹사이트, 상담 가능 시간, 주소 입력
 */

interface ContactInfoEditorProps {
  website: string;
  consultationHours: string;
  address: string;
  onChange: (website: string, consultationHours: string, address: string) => void;
}

export default function ContactInfoEditor({
  website,
  consultationHours,
  address,
  onChange,
}: ContactInfoEditorProps) {
  const [localWebsite, setLocalWebsite] = useState(website);
  const [localHours, setLocalHours] = useState(consultationHours);
  const [localAddress, setLocalAddress] = useState(address);

  const handleChange = (field: 'website' | 'hours' | 'address', value: string) => {
    if (field === 'website') {
      setLocalWebsite(value);
      onChange(value, localHours, localAddress);
    } else if (field === 'hours') {
      setLocalHours(value);
      onChange(localWebsite, value, localAddress);
    } else if (field === 'address') {
      setLocalAddress(value);
      onChange(localWebsite, localHours, value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">연락처 정보 안내</h3>
            <p className="text-sm text-blue-700">
              입력한 정보는 브랜드 페이지 하단 "연락처 정보" 섹션에 표시됩니다.
              <br />
              모든 항목은 선택사항이며, 입력한 항목만 공개됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 웹사이트 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-globe text-blue-500 mr-2"></i>
          홈페이지 주소
        </label>
        <input
          type="url"
          value={localWebsite}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://example.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          회사 또는 서비스 홈페이지 URL을 입력하세요 (복사 버튼 제공)
        </p>
      </div>

      {/* 상담 가능 시간 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-clock text-blue-500 mr-2"></i>
          운영시간 / 상담 가능 시간
        </label>
        <textarea
          value={localHours}
          onChange={(e) => handleChange('hours', e.target.value)}
          placeholder="예:&#10;평일 09:00 ~ 18:00&#10;토요일 09:00 ~ 13:00&#10;일요일 및 공휴일 휴무"
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
        />
        <p className="mt-1 text-sm text-gray-500">
          줄바꿈(Enter)으로 여러 줄 입력 가능
        </p>
      </div>

      {/* 주소 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-map-marker-alt text-blue-500 mr-2"></i>
          회사 주소
        </label>
        <textarea
          value={localAddress}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="예:&#10;서울특별시 강남구 테헤란로 123&#10;ABC빌딩 5층"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">
          줄바꿈(Enter)으로 여러 줄 입력 가능
        </p>
      </div>

      {/* 미리보기 */}
      {(localWebsite || localHours || localAddress) && (
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
            <i className="fas fa-eye text-gray-500 mr-2"></i>
            미리보기
          </h3>
          <div className="space-y-4">
            {localWebsite && (
              <div className="flex items-start">
                <i className="fas fa-globe text-gray-400 mr-3 mt-1"></i>
                <div>
                  <div className="text-xs text-gray-500 mb-1">웹사이트</div>
                  <div className="text-sm text-gray-900 break-all">{localWebsite}</div>
                </div>
              </div>
            )}
            {localHours && (
              <div className="flex items-start">
                <i className="fas fa-clock text-gray-400 mr-3 mt-1"></i>
                <div>
                  <div className="text-xs text-gray-500 mb-1">상담 가능 시간</div>
                  <div className="text-sm text-gray-900 whitespace-pre-line">{localHours}</div>
                </div>
              </div>
            )}
            {localAddress && (
              <div className="flex items-start">
                <i className="fas fa-map-marker-alt text-gray-400 mr-3 mt-1"></i>
                <div>
                  <div className="text-xs text-gray-500 mb-1">주소</div>
                  <div className="text-sm text-gray-900 whitespace-pre-line">{localAddress}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
