'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  specialties: string[];
  imageKey: string;
  imageUrl?: string;
  order: number;
  isActive: boolean;
}

export default function AdminExpertServicesPage() {
  const router = useRouter();

  // 전문가 관리 상태
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    companyName: '',
    specialties: '',
    imageKey: '',
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      const response = await fetch('/api/expert-services/experts');
      const data = await response.json();
      if (data.success) {
        setExperts(data.experts);
      }
    } catch (error) {
      console.error('Error fetching experts:', error);
      alert('전문가 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(s => s);

    const requestData = {
      ...formData,
      specialties: specialtiesArray,
    };

    try {
      const url = editingExpert
        ? `/api/expert-services/experts/${editingExpert._id}`
        : '/api/expert-services/experts';

      const method = editingExpert ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true'
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(editingExpert ? '전문가가 수정되었습니다.' : '전문가가 등록되었습니다.');
        resetForm();
        fetchExperts();
      } else {
        alert(data.error || '등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expert: Expert) => {
    setEditingExpert(expert);
    setFormData({
      name: expert.name,
      position: expert.position,
      companyName: expert.companyName,
      specialties: expert.specialties.join(', '),
      imageKey: expert.imageKey,
      order: expert.order,
      isActive: expert.isActive,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 전문가를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expert-services/experts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-auth': 'true'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('전문가가 삭제되었습니다.');
        fetchExperts();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setEditingExpert(null);
    setFormData({
      name: '',
      position: '',
      companyName: '',
      specialties: '',
      imageKey: '',
      order: 0,
      isActive: true,
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>전문가 서비스 관리</h1>
        <button onClick={() => router.push('/expert-services')} style={{
          padding: '8px 16px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          사용자 페이지 보기
        </button>
      </div>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
          {editingExpert ? '전문가 수정' : '새 전문가 등록'}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px' }}>이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px' }}>직책</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px' }}>회사명</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px' }}>전문 분야 (쉼표로 구분)</label>
            <input
              type="text"
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              placeholder="예: 세무조사, 절세전략, 기업자문"
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px' }}>이미지 키</label>
            <input
              type="text"
              value={formData.imageKey}
              onChange={(e) => setFormData({ ...formData, imageKey: e.target.value })}
              placeholder="예: kim-young-soo"
              required
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              이미지는 /public/images/examiners/ 폴더에 [이미지키].png 형식으로 업로드하세요
            </small>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px' }}>정렬 순서</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              id="isActive"
            />
            <label htmlFor="isActive" style={{ fontWeight: '600', fontSize: '14px' }}>
              활성화
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" disabled={loading} style={{
              padding: '10px 20px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}>
              {loading ? '처리 중...' : editingExpert ? '수정' : '등록'}
            </button>
            {editingExpert && (
              <button type="button" onClick={resetForm} style={{
                padding: '10px 20px',
                background: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}>
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>
          등록된 전문가 목록 ({experts.length})
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {experts.map((expert) => (
            <div key={expert._id} style={{
              padding: '15px',
              background: '#f9f9f9',
              borderRadius: '8px',
              border: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  {expert.name} {expert.position}
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                  {expert.companyName}
                </p>
                <p style={{ color: '#2196F3', fontSize: '13px', marginBottom: '5px' }}>
                  {expert.specialties.join(', ')}
                </p>
                <p style={{ color: '#999', fontSize: '12px' }}>
                  정렬: {expert.order} | 이미지: {expert.imageKey} | {expert.isActive ? '✅ 활성' : '❌ 비활성'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleEdit(expert)} style={{
                  padding: '6px 12px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  수정
                </button>
                <button onClick={() => handleDelete(expert._id)} style={{
                  padding: '6px 12px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
