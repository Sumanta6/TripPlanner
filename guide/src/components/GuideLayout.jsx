import { Outlet } from 'react-router-dom';
import GuideNavbar from './GuideNavbar';
import GuideChatLauncher from './GuideChatLauncher';

export default function GuideLayout({ onLogout }) {
    return (
        <div className="guide-layout">
            <GuideNavbar onLogout={onLogout} />
            <main className="guide-main-content">
                <Outlet />
            </main>
            <GuideChatLauncher />
        </div>
    );
}
