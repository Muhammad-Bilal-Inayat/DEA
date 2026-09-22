import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterServerControlModal } from './MasterServerControlModal';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectToPageOnAuth?: boolean;
}

export const MasterAdminModal: React.FC<MasterAdminModalProps> = ({ 
  isOpen, 
  onClose,
  redirectToPageOnAuth = false 
}) => {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    if (redirectToPageOnAuth) {
      onClose();
      navigate('/server');
    }
  };

  return (
    <MasterServerControlModal 
      isOpen={isOpen} 
      onClose={onClose} 
      onAuthSuccess={handleAuthSuccess} 
    />
  );
};

