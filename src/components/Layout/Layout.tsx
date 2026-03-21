import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useApp } from '../../contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Layout.module.css';

export function Layout() {
  const { isLoading } = useApp();

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
              zIndex: 9999,
              overflow: 'hidden'
            }}
          >
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255,255,255,0.5)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Sidebar />
      <div className={styles.mainContent}>
        <Topbar />
        <main className={styles.pageContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
