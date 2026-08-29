import { Link, useNavigate } from 'react-router-dom';
import { cx } from '../utils/cx';
import styles from './Sidebar.module.css';

// active: 'main' | 'input'
export default function Sidebar({ active }) {
  const navigate = useNavigate();

  function openServiceGuide() {
    navigate('/', { state: { scrollToServiceGuideAt: Date.now() } });
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <Link to="/" className={styles['logo-row']}>
          <div className={styles['logo-mark']}>P</div>
          <div>
            <div className={styles['logo-name']}>PREP</div>
            <div className={styles['logo-sub']}>Startup Preparation &amp; Evaluation</div>
          </div>
        </Link>
      </div>

      <div className={styles.nav}>
        <Link to="/" className={cx(styles, 'nav-item', active === 'main' && 'active')}>
          <i className="ti ti-home"></i>메인
        </Link>
        <div className={styles['nav-divider']}></div>
        <Link to="/input" className={cx(styles, 'nav-item', active === 'input' && 'active')}>
          <i className="ti ti-shield-check"></i>아이디어 검진
        </Link>
        <div className={styles['nav-section']}>검진 후 이용 가능</div>
        <a className={cx(styles, 'nav-item', 'disabled')} href="#!">
          <i className="ti ti-wallet"></i>지원금 매칭
        </a>
      </div>

      <div className={styles['sidebar-bottom']}>
        <button type="button" className={styles['nav-item']} onClick={openServiceGuide}>
          <i className="ti ti-help"></i>도움말
        </button>
      </div>
    </div>
  );
}
