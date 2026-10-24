import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cx } from '../utils/cx';
import styles from './Sidebar.module.css';

// active: 'main' | 'input' | 'funding' | 'proposal' | 'help'
export default function Sidebar({ active }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        className={styles['mobile-menu-button']}
        aria-label="메뉴 열기"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <i className="ti ti-menu-2" aria-hidden="true"></i>
      </button>
      {isOpen && (
        <button
          type="button"
          className={styles.overlay}
          aria-label="메뉴 닫기"
          onClick={closeMenu}
        />
      )}
      <div className={cx(styles, 'sidebar', isOpen && 'open')}>
      <div className={styles.logo}>
        <Link to="/" className={styles['logo-row']} onClick={closeMenu}>
          <div className={styles['logo-mark']}>P</div>
          <div>
            <div className={styles['logo-name']}>PREP</div>
            <div className={styles['logo-sub']}>Startup Preparation &amp; Evaluation</div>
          </div>
        </Link>
        <button type="button" className={styles['mobile-close']} aria-label="메뉴 닫기" onClick={closeMenu}>
          <i className="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>

      <div className={styles.nav}>
        <Link to="/" className={cx(styles, 'nav-item', active === 'main' && 'active')} onClick={closeMenu}>
          <i className="ti ti-home"></i>메인
        </Link>
        <div className={styles['nav-divider']}></div>
        <Link to="/input" className={cx(styles, 'nav-item', active === 'input' && 'active')} onClick={closeMenu}>
          <i className="ti ti-shield-check"></i>아이디어 검진
        </Link>
        <div className={styles['nav-section']}>검진 후 이용 가능</div>
        <Link to="/funding-match" className={cx(styles, 'nav-item', active === 'funding' && 'active')} onClick={closeMenu}>
          <i className="ti ti-wallet"></i>지원사업 매칭
        </Link>
        <Link to="/proposal-writer" className={cx(styles, 'nav-item', active === 'proposal' && 'active')} onClick={closeMenu}>
          <i className="ti ti-file-pencil"></i>제안서 작성
        </Link>
      </div>

      <div className={styles['sidebar-bottom']}>
        <Link to="/help" className={cx(styles, 'nav-item', active === 'help' && 'active')} onClick={closeMenu}>
          <i className="ti ti-help"></i>도움말
        </Link>
      </div>
    </div>
    </>
  );
}
