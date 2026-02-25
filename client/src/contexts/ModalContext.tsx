import React, { createContext, useContext, useState, ReactNode } from 'react'

export type ModalType = 'tos' | 'privacy' | 'contact' | 'upgrade' | 'confirm' | null

interface ConfirmationModal {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

interface ModalContextType {
  activeModal: ModalType
  setActiveModal: (modal: ModalType) => void
  confirmModal: ConfirmationModal
  showConfirmation: (title: string, message: string, onConfirm: () => void) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [confirmModal, setConfirmModal] = useState<ConfirmationModal>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  })

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm()
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, onCancel: () => {} })
      },
      onCancel: () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, onCancel: () => {} })
      }
    })
  }

  return (
    <ModalContext.Provider value={{ activeModal, setActiveModal, confirmModal, showConfirmation }}>
      {children}
    </ModalContext.Provider>
  )
}