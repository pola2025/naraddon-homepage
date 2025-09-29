import CertifiedExaminersPage from '@/components/certified-examiners/CertifiedExaminersPage';
import styles from './page.module.css';

export default function Page() {
  return (
    <div className={styles.pageWrapper} style={{ backgroundColor: '#0A0A0A', minHeight: '100vh' }}>
      <CertifiedExaminersPage />
    </div>
  );
}