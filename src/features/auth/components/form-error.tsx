import { Alert, AlertDescription } from "@/components/ui/alert";

interface IFormErrorProps {
  message: string | null;
}

export default function FormError({ message }: IFormErrorProps) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
