'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ExpertServicesAdmin.module.css';

interface Expert {
  _id: string;
  name: string;
  position: string;
  companyName: string;
  specialties: string[];
  imageKey: string;
  order: number;
  isActive: boolean;
}

export default function ExpertServicesAdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      fetchExperts();
    }
  }, [isAuthenticated]);

  const fetchExperts = async () => {
    try {
      const response = await fetch('/api/experts');
      const data = await response.json();
      if (data.success) {
        setExperts(data.experts);
      }
    } catch (error) {
      console.error('Error fetching experts:', error);
      alert('전문가 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_EXPERT_SERVICES_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('expertServicesAuth', 'true');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const specialtiesArray = formData.specialties.split(',').map(s => s.trim()).filter(s => s);

    const requestData = {
      ...formData,
      specialties: specialtiesArray,
      password: password,
    };

    try {
      const url = editingExpert
        ? '/api/experts'
        : '/api/experts';

      const method = editingExpert ? 'PUT' : 'POST';

      if (editingExpert) {
        requestData.id = editingExpert._id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
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
      const response = await fetch(`/api/experts?id=${id}&password=${password}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
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

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.loginBox}>
          <h1>전문가 서비스 관리</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.passwordInput}
            />
            <button type="submit" className={styles.loginButton}>
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>전문가 서비스 관리</h1>

      <div className={styles.formSection}>
        <h2>{editingExpert ? '전문가 수정' : '새 전문가 등록'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>직책</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>회사명</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>전문 분야 (쉼표로 구분)</label>
            <input
              type="text"
              value={formData.specialties}
              onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
              placeholder="예: 세무조사, 절세전략, 기업자문"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>이미지 키</label>
            <input
              type="text"
              value={formData.imageKey}
              onChange={(e) => setFormData({ ...formData, imageKey: e.target.value })}
              placeholder="예: kim-young-soo"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>정렬 순서</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
            />
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              활성화
            </label>
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" disabled={loading}>
              {loading ? '처리 중...' : editingExpert ? '수정' : '등록'}
            </button>
            {editingExpert && (
              <button type="button" onClick={resetForm}>
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      <div className={styles.listSection}>
        <h2>등록된 전문가 목록</h2>
        <div className={styles.expertList}>
          {experts.map((expert) => (
            <div key={expert._id} className={styles.expertCard}>
              <div className={styles.expertInfo}>
                <h3>{expert.name} {expert.position}</h3>
                <p>{expert.companyName}</p>
                <p className={styles.specialties}>
                  {expert.specialties.join(', ')}
                </p>
                <p className={styles.meta}>
                  정렬: {expert.order} | {expert.isActive ? '활성' : '비활성'}
                </p>
              </div>
              <div className={styles.actions}>
                <button onClick={() => handleEdit(expert)}>수정</button>
                <button onClick={() => handleDelete(expert._id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}