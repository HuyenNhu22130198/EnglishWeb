import styles from './AdminLayout.module.css';

const AdminEmptyPage = ({ title }) => {
  return (
    <div
      style={{
        border: '1px solid #eee7e1',
        borderRadius: 24,
        padding: 32,
        background: '#fff',
        boxShadow: '0 18px 48px rgba(17, 24, 39, 0.07)',
      }}
    >
      <p
        style={{
          margin: '0 0 8px',
          color: '#0e3377',
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Admin
      </p>

      <h1 style={{ margin: 0 }}>{title}</h1>

      <p style={{ color: '#555b63' }}>
        Trang này sẽ được xây dựng sau. 
      </p>
    </div>
  );
};

export default AdminEmptyPage;