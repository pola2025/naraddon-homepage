export default function CertifiedExaminersPage() {
  return (
    <div style={{ marginTop: '-50px' }}>
      <iframe
        src="/examiners.html"
        style={{
          width: '100%',
          height: 'calc(100vh + 50px)',
          border: 'none',
          margin: 0,
          padding: 0,
          overflow: 'auto',
          display: 'block'
        }}
        title="Certified Examiners"
      />
    </div>
  );
}