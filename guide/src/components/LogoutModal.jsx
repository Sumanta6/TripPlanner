import { useEffect, useRef } from 'react';
import { FaSignOutAlt } from 'react-icons/fa';
import './LogoutModal.css';

export default function LogoutModal({ isOpen, onClose, onConfirm }) {
    const overlayRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Close on outside click
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div 
            className="logout-modal-overlay active" 
            ref={overlayRef} 
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
        >
            <div className="logout-modal-content">
                <div className="logout-icon-circle">
                    <FaSignOutAlt className="logout-icon" />
                </div>
                
                <h2 id="logout-title">Ready to leave?</h2>
                <p>You will be securely signed out and will need to log in again to access your dashboard.</p>
                
                <div className="logout-modal-actions">
                    <button 
                        className="logout-modal-btn cancel" 
                        onClick={onClose}
                        autoFocus
                    >
                        Cancel
                    </button>
                    <button 
                        className="logout-modal-btn confirm" 
                        onClick={onConfirm}
                    >
                        Yes, Log me out
                    </button>
                </div>
            </div>
        </div>
    );
}
