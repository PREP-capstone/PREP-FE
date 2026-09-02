import { Link } from 'react-router-dom';
import { cx } from '../utils/cx';
import styles from './Sidebar.module.css';

// active: 'main' | 'input' | 'funding' | 'proposal' | 'help'
export default function Sidebar({ active }) {
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
        <Link to="/funding-match" className={cx(styles, 'nav-item', active === 'funding' && 'active')}>
          <i className="ti ti-wallet"></i>지원금 매칭
        </Link>
        <Link to="/proposal-writer" className={cx(styles, 'nav-item', active === 'proposal' && 'active')}>
          <i className="ti ti-file-pencil"></i>제안서 작성
        </Link>
      </div>

      <div className={styles['sidebar-bottom']}>
        <Link to="/help" className={cx(styles, 'nav-item', active === 'help' && 'active')}>
          <i className="ti ti-help"></i>도움말
        </Link>
      </div>
    </div>
  );
}
