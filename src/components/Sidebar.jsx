import { Link } from 'react-router-dom';
import { cx } from '../utils/cx';
import styles from './Sidebar.module.css';

// active: 'main' | 'input'
export default function Sidebar({ active }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles['logo-row']}>
          <div className={styles['logo-mark']}>P</div>
          <div>
            <div className={styles['logo-name']}>PREP</div>
            <div className={styles['logo-sub']}>Startup Preparation &amp; Evaluation</div>
          </div>
        </div>
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
        <a className={cx(styles, 'nav-item', 'disabled')} href="#!">
          <i className="ti ti-file-description"></i>창업 제안서
        </a>
      </div>

      <div className={styles['sidebar-bottom']}>
        <a className={styles['nav-item']} href="#!"><i className="ti ti-user"></i>마이페이지</a>
        <a className={styles['nav-item']} href="#!"><i className="ti ti-help"></i>도움말</a>
        <a className={styles['nav-item']} href="#!"><i className="ti ti-logout"></i>로그아웃</a>
      </div>
    </div>
  );
}
