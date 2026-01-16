import { useSendReturnedRemindersMutation } from '@/redux/features/approvalSlice';
import { useAppSelector } from '@/redux/hooks';
import React, { useState } from 'react';
import { BiBell, BiCheckCircle, BiErrorCircle, BiInfoCircle, BiX } from 'react-icons/bi';
import styles from '../styles/styles.module.css';
import modalStyles from './Modal.module.css';

interface Props {
  headers: string[]
  onHeaderClick: (index: number) => void
  showSortIcons: (index: number) => boolean
  getIcon: (index: number) => any
  ImageComponent: React.ComponentType<any>
  children: React.ReactNode
  selectedVendors: any[]
  setSelectedVendors?: React.Dispatch<React.SetStateAction<any[]>>
}

interface BulkResult {
  successful: Array<{
    id: string;
    companyName: string;
    email: string;
    daysSinceReturn: number;
  }>;
  failed: Array<{
    id: string;
    companyName?: string;
    reason: string;
  }>;
  total: number;
}

// Inline ConfirmModal Component
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: 'info' | 'warning' | 'danger';
}

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  type = 'info'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={modalStyles.modalOverlay} onClick={onCancel}>
      <div className={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.modalHeader}>
          <h3>{title}</h3>
          <button className={modalStyles.closeButton} onClick={onCancel}>
            <BiX size={24} />
          </button>
        </div>

        <div className={modalStyles.modalBody}>
          <div className={`${modalStyles.iconContainer} ${modalStyles[type]}`}>
            <BiInfoCircle size={48} color={"#098509"} />
          </div>
          <p className={modalStyles.mainMessage}>{message}</p>
        </div>

        <div className={modalStyles.modalFooter}>
          <button
            className={modalStyles.cancelButton}
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`${modalStyles.confirmButton} ${modalStyles[type]}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline ResultModal Component
interface ResultModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type: 'success' | 'error' | 'info';
  details?: string[];
}

function ResultModal({
  isOpen,
  title,
  message,
  onClose,
  type,
  details
}: ResultModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <BiCheckCircle size={48} />;
      case 'error':
        return <BiErrorCircle size={48} />;
      case 'info':
        return <BiInfoCircle size={48} />;
      default:
        return <BiInfoCircle size={48} />;
    }
  };

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div className={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.modalHeader}>
          <h3>{title}</h3>
          <button className={modalStyles.closeButton} onClick={onClose}>
            <BiX size={24} />
          </button>
        </div>

        <div className={modalStyles.modalBody}>
          <div className={`${modalStyles.iconContainer} ${modalStyles[type]}`}>
            {getIcon()}
          </div>
          <p className={modalStyles.mainMessage}>{message}</p>

          {details && details.length > 0 && (
            <div className={modalStyles.detailsList}>
              {details.map((detail, index) => (
                <p key={index} className={modalStyles.detailItem}>{detail}</p>
              ))}
            </div>
          )}
        </div>

        <div className={modalStyles.modalFooter}>
          <button className={modalStyles.closeOnlyButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Main DataTable Component
export default function DataTable({
  headers,
  onHeaderClick,
  showSortIcons,
  getIcon,
  ImageComponent,
  children,
  selectedVendors,
  setSelectedVendors
}: Props) {
  const renderHeader = (header: string, index: number) => {
    const hasSortIcon = showSortIcons(index)

    return (
      <td key={index}>
        <div
          className={styles.tableHeading}
          onClick={() => onHeaderClick(index)}
          style={{ cursor: hasSortIcon ? 'pointer' : 'default' }}
        >
          {hasSortIcon && (
            <ImageComponent
              src={getIcon(index)}
              alt="sort icon"
              width={15}
              height={15}
            />
          )}
          <p>{header}</p>
        </div>
      </td>
    )
  }

  const user = useAppSelector((state: any) => state?.user?.user);
  const [sendReminders, { isLoading: isSendingReminders }] = useSendReturnedRemindersMutation();

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    details?: string[];
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    details: []
  });

  // Modal helper functions
  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => { }
    });
  };

  const showResult = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info',
    details?: string[]
  ) => {
    setResultModal({
      isOpen: true,
      title,
      message,
      type,
      details
    });
  };

  const closeResultModal = () => {
    setResultModal({
      isOpen: false,
      title: '',
      message: '',
      type: 'info',
      details: []
    });
  };

  // Validation function
  const validateBulkAction = (): { valid: boolean; message: string } => {
    if (selectedVendors.length === 0) {
      return {
        valid: false,
        message: "Please select at least one contractor"
      };
    }

    if (selectedVendors.length > 50) {
      return {
        valid: false,
        message: "Cannot send reminders to more than 50 contractors at once"
      };
    }

    return { valid: true, message: "" };
  };

  // Format result details
  const formatResultDetails = (results: BulkResult): { message: string; details?: string[] } => {
    const { successful, failed } = results;

    // All successful
    if (failed.length === 0) {
      return {
        message: `Successfully sent reminders to all ${successful.length} contractor${successful.length > 1 ? 's' : ''}`,
        details: undefined
      };
    }

    // All failed
    if (successful.length === 0) {
      return {
        message: 'Failed to send all reminders',
        details: failed.map(f => `${f.companyName || f.id}: ${f.reason}`)
      };
    }

    // Mixed results
    return {
      message: `Successfully sent reminders to ${successful.length} contractor${successful.length > 1 ? 's' : ''}`,
      details: [
        `${failed.length} failed:`,
        ...failed.map(f => `${f.companyName || f.id}: ${f.reason}`)
      ]
    };
  };

  // Send reminders function
  const handleSendReminders = async () => {
    try {
      // Extract vendor IDs
      const vendorIds = selectedVendors.map(v => v._id);

      // Send reminders
      const response = await sendReminders({ vendorIds, userRole: user?.role }).unwrap();

      // Close confirmation modal
      closeConfirmModal();

      // Format and show result
      if (response.data) {
        const { message, details } = formatResultDetails(response.data);
        const type = response.data.failed.length === 0 ? 'success' :
          response.data.successful.length === 0 ? 'error' : 'info';

        showResult(
          type === 'success' ? 'Reminders Sent' :
            type === 'error' ? 'Failed to Send Reminders' : 'Partial Success',
          message,
          type,
          details
        );

        // Clear selections on success
        if (response.data.successful.length > 0 && setSelectedVendors) {
          setSelectedVendors([]);
        }
      }

    } catch (error: any) {
      console.error('Error sending reminders:', error);
      closeConfirmModal();
      showResult(
        'Error',
        error?.data?.message || 'Failed to send reminders. Please try again.',
        'error'
      );
    }
  };

  const sendReturnsReminder = () => {
    // Validate
    const validation = validateBulkAction();
    if (!validation.valid) {
      showResult('Validation Error', validation.message, 'error');
      return;
    }

    // Show confirmation
    showConfirmation(
      'Send Reminders',
      `Are you sure you want to send reminders to ${selectedVendors.length} contractor${selectedVendors.length > 1 ? 's' : ''}?`,
      handleSendReminders
    );
  };

  return (
    <>
      <table>
        <thead>
          <tr>
            {headers.map(renderHeader)}
          </tr>

          {selectedVendors.length > 0 && (
            <div className={styles.selectedCountRow}>
              <div>
                <div>
                  {selectedVendors.length} selected

                  <button
                    className={styles.clearSelectionButton}
                    onClick={() => { setSelectedVendors?.([]) }}
                  >
                    <BiX size={18} color="white" />
                  </button>
                </div>

                <button
                  onClick={sendReturnsReminder}
                  className={styles.sendReminderButton}
                  disabled={isSendingReminders}
                >
                  <BiBell size={18} /> {isSendingReminders ? 'Sending...' : 'Send Reminder'}
                </button>
              </div>
            </div>
          )}
        </thead>
        <tbody>{children}</tbody>
      </table>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        confirmText="Send Reminders"
        cancelText="Cancel"
        isLoading={isSendingReminders}
        type="info"
      />

      <ResultModal
        isOpen={resultModal.isOpen}
        title={resultModal.title}
        message={resultModal.message}
        type={resultModal.type}
        details={resultModal.details}
        onClose={closeResultModal}
      />
    </>
  )
}