import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (code: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  isOpen,
  onClose,
  onEnroll,
  isLoading = false,
  error = null,
}) => {
  const [enrollmentCode, setEnrollmentCode] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollmentCode.trim()) {
      await onEnroll(enrollmentCode.trim().toUpperCase());
    }
  };

  const handleClose = () => {
    setEnrollmentCode("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:lock" className="text-primary" width={24} height={24} />
              <span>Введи код доступа</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-default-500 text-sm mb-4">
              Чтобы присоединиться к курсу, введи код доступа, который выдал преподаватель.
            </p>
            <Input
              label="Код доступа"
              placeholder="Введи код (например, ABC12345)"
              value={enrollmentCode}
              onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
              isRequired
              autoFocus
              maxLength={20}
              classNames={{
                input: "uppercase",
              }}
              startContent={<Icon icon="lucide:key" className="text-default-400" />}
              errorMessage={error || undefined}
              isInvalid={!!error}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={handleClose}
              isDisabled={isLoading}
            >
              Отмена
            </Button>
            <Button
              color="primary"
              type="submit"
              isLoading={isLoading}
              startContent={!isLoading && <Icon icon="lucide:check" />}
            >
              Присоединиться
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
